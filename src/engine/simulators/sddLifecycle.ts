import { posting } from '../ledger/journal'
import { ACCOUNTS } from '../ledger/types'
import { beginTransfer, compensateTransfer, settleTransfer } from '../ledger/movements'
import { addDays, daysBetween } from '../compliance/dates'
import { DunningStage, SeedLease } from '../seed/types'
import {
  organicRFails,
  paymentDayFor,
  rollToBusinessDay,
  rReason,
  settlementOffsetDays,
  timingProfileOf,
} from './realism'
import type { WorldState } from '../world'

/**
 * Rent lifecycle with payment-timing realism (Addendum D2 §2.2):
 * rent falls due on the lease's OWN payment day (1st/3rd/5th/10th — set at
 * signing, not all the 1st); the SDD presentation goes out the same day and
 * settlement scatters around it with a per-tenant punctuality personality
 * that is consistent month over month. Settlement rolls off weekends.
 */

/** Rent due on the lease's payment day: receivable up, owed to the owner. */
export function postRentDue(s: WorldState, day: string): void {
  const dayOfMonth = Number(day.slice(8))
  for (const lease of activeLeases(s, day)) {
    if (paymentDayFor(lease) !== dayOfMonth) continue
    const gross = lease.monthlyRentCents + lease.chargesCents
    s.journal.append({
      id: s.journal.nextId(),
      date: day,
      kind: 'rent_due',
      memo: `Rent + charges due — ${lease.id}`,
      postings: [
        posting(ACCOUNTS.rentReceivable(lease.id), 'debit', gross, dims(lease)),
        posting(ACCOUNTS.ownerPayable(lease.entityId), 'credit', gross, dims(lease)),
      ],
    })
    scheduleCollection(s, lease, day)
  }
}

/**
 * SDD presentation on the due day. Each open receivable becomes a two-phase
 * transfer intent that settles (or R-fails into a compensating event) on
 * due + the tenant's settlement lag, rolled to a business day. The sweep
 * collects the FULL open receivable, so last month's R recovers this month
 * unless a story keeps it failing. Benefit-paid leases split: the state
 * portion always settles on time; the tenant portion has its own personality.
 */
function scheduleCollection(s: WorldState, lease: SeedLease, day: string): void {
  const receivable = s.journal.balance(ACCOUNTS.rentReceivable(lease.id))
  if (receivable <= 0) return
  const month = day.slice(0, 7)
  const profile = timingProfileOf(s.persona)
  const forcedFrom = s.forceRFrom.get(lease.id)
  const fails =
    (forcedFrom !== undefined && day >= forcedFrom) || organicRFails(lease, month, profile)

  let collectible = receivable
  if (!fails && lease.coTenants?.some((ct) => ct.paysLate)) {
    const lateShare = lease.coTenants
      .filter((ct) => ct.paysLate)
      .reduce((sum, ct) => sum + ct.shareCents, 0)
    collectible = Math.max(0, receivable - lateShare)
    if (collectible < receivable && !s.arrearsSince.has(lease.id)) {
      s.arrearsSince.set(lease.id, day)
    }
  }
  if (fails) collectible = receivable

  // Benefit portion (CAF/APL/huurtoeslag): paid by the state, on time, never R.
  const benefit = Math.min(lease.benefitCents ?? 0, collectible)
  if (benefit > 0 && !fails) {
    const stateIntent = beginTransfer(s.journal, {
      from: ACCOUNTS.rentReceivable(lease.id),
      to: ACCOUNTS.operating,
      amountCents: benefit,
      dims: { ...dims(lease), category: 'rent_benefit' },
      memo: `Housing-benefit portion — ${lease.id}`,
      date: day,
    })
    s.pendingIntents.push({
      intent: stateIntent,
      settleOn: rollToBusinessDay(day),
      fail: false,
      leaseId: lease.id,
    })
    collectible -= benefit
  }
  if (collectible <= 0) return

  const settleOn = rollToBusinessDay(addDays(day, settlementOffsetDays(lease, month, profile)))
  const intent = beginTransfer(s.journal, {
    from: ACCOUNTS.rentReceivable(lease.id),
    to: ACCOUNTS.operating,
    amountCents: collectible,
    dims: dims(lease),
    memo: `SDD collection — ${lease.id}`,
    date: day,
  })
  s.pendingIntents.push({ intent, settleOn, fail: fails, leaseId: lease.id })
}

/** Settle or R-fail SDD intents whose settlement date has arrived. */
export function resolvePendingCollections(s: WorldState, day: string): void {
  const due = s.pendingIntents.filter((p) => p.settleOn <= day)
  s.pendingIntents = s.pendingIntents.filter((p) => p.settleOn > day)
  for (const p of due) {
    if (p.fail) {
      // Forced (demo button / story) Rs are the classic AM04; organic ones vary.
      const forced = s.forceRFrom.has(p.leaseId)
      const reason = forced ? 'insufficient funds (AM04)' : rReason(p.leaseId, day.slice(0, 7))
      compensateTransfer(s.journal, p.intent, day, `R-transaction: ${reason}`)
      if (!s.arrearsSince.has(p.leaseId)) s.arrearsSince.set(p.leaseId, day)
    } else {
      settleTransfer(s.journal, p.intent, day)
      const lease = s.leases.find((l) => l.id === p.leaseId)!
      if (s.journal.balance(ACCOUNTS.rentReceivable(lease.id)) <= 0) {
        s.arrearsSince.delete(lease.id)
      }
    }
  }
}

/** One-off tenant payment against the open receivable (arrears arcs, D2 §4). */
export function payReceivable(s: WorldState, leaseId: string, day: string, amountCents?: number): void {
  const lease = s.leases.find((l) => l.id === leaseId)
  if (!lease) return
  const open = s.journal.balance(ACCOUNTS.rentReceivable(leaseId))
  const amount = Math.min(open, amountCents ?? open)
  if (amount <= 0) return
  s.journal.append({
    id: s.journal.nextId(),
    date: day,
    kind: 'tenant_payment',
    memo: `Manual payment received — catch-up ${leaseId}`,
    postings: [
      posting(ACCOUNTS.operating, 'debit', amount, dims(lease)),
      posting(ACCOUNTS.rentReceivable(leaseId), 'credit', amount, dims(lease)),
    ],
  })
  if (s.journal.balance(ACCOUNTS.rentReceivable(leaseId)) <= 0) {
    s.arrearsSince.delete(leaseId)
  }
}

const DUNNING_LADDER: [number, DunningStage][] = [
  [75, 'escalated'],
  [45, 'payment_plan_offered'],
  [21, 'formal_notice'],
  [5, 'reminder_sent'],
]

/** Dunning stage is a pure function of how long the lease has been in arrears. */
export function deriveDunning(s: WorldState, leaseId: string, today: string): DunningStage {
  const since = s.arrearsSince.get(leaseId)
  if (!since) return 'current'
  const days = daysBetween(since, today)
  for (const [threshold, stage] of DUNNING_LADDER) {
    if (days >= threshold) return stage
  }
  return 'current'
}

export function activeLeases(s: WorldState, day: string): SeedLease[] {
  return s.leases.filter(
    (l) => l.startDate <= day && (!l.moveOutDate || l.moveOutDate > day),
  )
}

function dims(lease: SeedLease) {
  return {
    entityId: lease.entityId,
    propertyId: lease.propertyId,
    leaseId: lease.id,
    jurisdiction: lease.jurisdiction,
    category: 'rent',
  }
}
