import { posting } from '../ledger/journal'
import { ACCOUNTS } from '../ledger/types'
import { beginTransfer, compensateTransfer, settleTransfer } from '../ledger/movements'
import { addDays, daysBetween } from '../compliance/dates'
import { DunningStage, SeedLease } from '../seed/types'
import type { WorldState } from '../world'

/** Rent falls due on the 1st: receivable up, owed to the owner. */
export function postRentDue(s: WorldState, day: string): void {
  for (const lease of activeLeases(s, day)) {
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
  }
}

/**
 * SDD collections fire on the 3rd. Each open receivable becomes a two-phase
 * transfer intent; it settles (or R-fails into a compensating event) two days
 * later via `resolvePendingCollections`. Flat-share leases collect per
 * co-tenant so a late co-tenant leaves only their share in arrears.
 */
export function collectRent(s: WorldState, day: string): void {
  for (const lease of s.leases) {
    const receivable = s.journal.balance(ACCOUNTS.rentReceivable(lease.id))
    if (receivable <= 0) continue
    const forcedFrom = s.forceRFrom.get(lease.id)
    const fails = forcedFrom !== undefined && day >= forcedFrom

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
    if (collectible <= 0) continue

    const intent = beginTransfer(s.journal, {
      from: ACCOUNTS.rentReceivable(lease.id),
      to: ACCOUNTS.operating,
      amountCents: fails ? receivable : collectible,
      dims: dims(lease),
      memo: `SDD collection — ${lease.id}`,
      date: day,
    })
    s.pendingIntents.push({ intent, settleOn: addDays(day, 2), fail: fails, leaseId: lease.id })
  }
}

/** Settle or R-fail SDD intents whose settlement date has arrived. */
export function resolvePendingCollections(s: WorldState, day: string): void {
  const due = s.pendingIntents.filter((p) => p.settleOn <= day)
  s.pendingIntents = s.pendingIntents.filter((p) => p.settleOn > day)
  for (const p of due) {
    if (p.fail) {
      compensateTransfer(s.journal, p.intent, day, 'R-transaction: insufficient funds (AM04)')
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
