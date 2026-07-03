import { Journal, posting } from './ledger/journal'
import { ACCOUNTS, JournalEvent } from './ledger/types'
import { addDays } from './compliance/dates'
import { DemoClock } from './simulators/clock'
import { BASE_DFR, INTERCHANGE_RATE, PRICING, splitYield } from './simulators/economics'
import {
  activeLeases,
  collectRent,
  deriveDunning,
  postRentDue,
  resolvePendingCollections,
} from './simulators/sddLifecycle'
import { accrueMonthlyYield, totalBalances } from './simulators/yieldAccrual'
import { postMonthlyCardSpend } from './simulators/cardFeed'
import { complianceView, evaluatePortfolio } from './compliance/evaluator'
import { RULESETS } from './compliance/rulesets'
import { Finding } from './compliance/types'
import { mulberry32 } from './seed/rng'
import { detectOpportunities, SavingsOpportunity } from './savings/detectors'
import { DunningStage, PersonaSeed, SeedLease } from './seed/types'

/** Distribution holdback: kept in owner_payable to cover card spend + arrears. */
const DISTRIBUTION_BUFFER_CENTS = 500_000

export interface PendingCollection {
  intent: JournalEvent
  settleOn: string
  fail: boolean
  leaseId: string
}

/** Serializable world state — survives page refresh via localStorage. */
export interface WorldSnapshot {
  personaId: string
  events: JournalEvent[]
  today: string
  dfr: number
  arrearsSince: [string, string][]
  forceRFrom: [string, string][]
  pendingIntents: PendingCollection[]
  executedSavings: string[]
}

export interface WorldState {
  journal: Journal
  leases: SeedLease[]
  persona: PersonaSeed
  dfr: number
  /** leaseId → date the lease fell into arrears (cleared when receivable hits 0). */
  arrearsSince: Map<string, string>
  /** leaseId → collections R-fail on/after this date. */
  forceRFrom: Map<string, string>
  pendingIntents: PendingCollection[]
  executedSavings: Set<string>
  rand: () => number
}

export interface Dashboard {
  unitCount: number
  balancesCents: number
  depositsCashCents: number
  reservesCashCents: number
  operatingCents: number
  arrearsCents: number
  violations: number
  /** Annualized revenue decomposition, cents per unit. */
  revenuePerUnit: { saas: number; nim: number; interchange: number; total: number }
  ownerYieldPerUnitCents: number
  noiAnnualCents: number
  pricingMode: 'yield_shared' | 'flat_fee'
  dfr: number
}

/**
 * The demo world: journal + clock + simulators for one persona. Construction
 * replays history from `persona.historyFrom` to `persona.epoch` through the
 * same tick pipeline that runs live on stage — one code path, no drift.
 */
export class DemoWorld {
  readonly state: WorldState
  readonly clock: DemoClock

  constructor(persona: PersonaSeed, snapshot?: WorldSnapshot) {
    this.state = {
      journal: Journal.fromEvents(snapshot?.events ?? persona.events),
      leases: persona.leases,
      persona,
      dfr: snapshot?.dfr ?? BASE_DFR,
      arrearsSince: new Map(snapshot?.arrearsSince ?? []),
      forceRFrom: new Map(
        snapshot ? snapshot.forceRFrom : Object.entries(persona.forceRFrom ?? {}),
      ),
      pendingIntents: snapshot?.pendingIntents ?? [],
      executedSavings: new Set(snapshot?.executedSavings ?? []),
      rand: mulberry32(0x5eed),
    }
    this.clock = new DemoClock(snapshot?.today ?? persona.historyFrom)
    this.clock.onTick((day, isMonthStart) => this.tick(day, isMonthStart))
    if (!snapshot) this.clock.advanceTo(persona.epoch)
  }

  snapshot(): WorldSnapshot {
    return {
      personaId: this.state.persona.id,
      events: [...this.journal.all],
      today: this.today,
      dfr: this.state.dfr,
      arrearsSince: [...this.state.arrearsSince],
      forceRFrom: [...this.state.forceRFrom],
      pendingIntents: this.state.pendingIntents,
      executedSavings: [...this.state.executedSavings],
    }
  }

  get journal(): Journal {
    return this.state.journal
  }

  get today(): string {
    return this.clock.today
  }

  private tick(day: string, isMonthStart: boolean): void {
    if (isMonthStart) {
      postRentDue(this.state, day)
      this.postSaasFees(day)
    }
    resolvePendingCollections(this.state, day)
    if (day.endsWith('-03')) collectRent(this.state, day)
    if (day.endsWith('-12')) postMonthlyCardSpend(this.state, day)
    if (addDays(day, 1).endsWith('-01')) accrueMonthlyYield(this.state, day)
    if (day.endsWith('-05')) this.distributeToOwners(day)
  }

  private postSaasFees(day: string): void {
    const { failsafe } = splitYield(this.state.dfr)
    const perUnit = failsafe ? PRICING.flatFee : PRICING[this.state.persona.pricingTier]
    const leases = activeLeases(this.state, day)
    if (leases.length === 0) return
    this.journal.append({
      id: this.journal.nextId(),
      date: day,
      kind: failsafe ? 'saas_fee_flat' : 'saas_fee',
      memo: failsafe
        ? `Flat-fee mode (yield failsafe active): €${(perUnit / 100).toFixed(2)}/unit`
        : `SaaS fee (${this.state.persona.pricingTier}): €${(perUnit / 100).toFixed(2)}/unit`,
      postings: [
        ...leases.map((l) =>
          posting(ACCOUNTS.ownerPayable(l.entityId), 'debit', perUnit, {
            entityId: l.entityId,
            leaseId: l.id,
            category: 'saas_fee',
          }),
        ),
        posting(ACCOUNTS.feeIncome('saas'), 'credit', perUnit * leases.length, {
          category: 'saas_fee',
        }),
      ],
    })
  }

  private distributeToOwners(day: string): void {
    for (const entity of this.state.persona.entities) {
      const balance = this.journal.balance(ACCOUNTS.ownerPayable(entity.id))
      const payout = balance - DISTRIBUTION_BUFFER_CENTS
      if (payout <= 0) continue
      this.journal.append({
        id: this.journal.nextId(),
        date: day,
        kind: 'owner_distribution',
        memo: `Monthly distribution — ${entity.name}`,
        postings: [
          posting(ACCOUNTS.ownerPayable(entity.id), 'debit', payout, {
            entityId: entity.id,
            category: 'distribution',
          }),
          posting(ACCOUNTS.operating, 'credit', payout, {
            entityId: entity.id,
            category: 'distribution',
          }),
        ],
      })
    }
  }

  // ── Demo-panel controls ────────────────────────────────────────────────

  advanceDays(n: number): void {
    this.clock.advanceDays(n)
  }

  advanceMonths(n: number): void {
    this.clock.advanceMonths(n)
  }

  setDfr(dfr: number): void {
    this.state.dfr = dfr
  }

  /** Force the next SDD collections for a lease to R-fail. */
  forceRTransaction(leaseId: string): void {
    this.state.forceRFrom.set(leaseId, this.today)
  }

  clearForceR(leaseId: string): void {
    this.state.forceRFrom.delete(leaseId)
  }

  // ── Read models ────────────────────────────────────────────────────────

  findings(): Finding[] {
    return evaluatePortfolio(
      this.state.leases,
      complianceView(this.journal),
      RULESETS,
      this.today,
    )
  }

  dunningStage(leaseId: string): DunningStage {
    return deriveDunning(this.state, leaseId, this.today)
  }

  /** Execute a savings opportunity: books the success fee, marks it done. */
  executeSavings(opportunity: SavingsOpportunity): JournalEvent {
    if (this.state.executedSavings.has(opportunity.id)) {
      throw new Error(`Savings ${opportunity.id} already executed`)
    }
    const property = this.state.persona.properties.find((p) => p.id === opportunity.propertyId)!
    const event = this.journal.append({
      id: this.journal.nextId(),
      date: this.today,
      kind: 'savings_success_fee',
      memo: `${opportunity.label} executed — success fee on €${(opportunity.savingsCents / 100).toFixed(0)} savings`,
      postings: [
        posting(ACCOUNTS.ownerPayable(property.entityId), 'debit', opportunity.successFeeCents, {
          entityId: property.entityId,
          propertyId: property.id,
          category: 'savings_fee',
        }),
        posting(ACCOUNTS.feeIncome('savings_share'), 'credit', opportunity.successFeeCents, {
          propertyId: property.id,
          category: 'savings_fee',
        }),
      ],
    })
    this.state.executedSavings.add(opportunity.id)
    return event
  }

  savingsOpportunities(): (SavingsOpportunity & { executed: boolean })[] {
    return detectOpportunities(this.state.persona).map((o) => ({
      ...o,
      executed: this.state.executedSavings.has(o.id),
    }))
  }

  /** Commit a finding's prepared remediation as a real journal event. */
  applyRemediation(finding: Finding): JournalEvent {
    if (!finding.remediation) throw new Error(`Finding ${finding.ruleId} has no remediation`)
    return this.journal.append({
      id: this.journal.nextId(),
      date: this.today,
      kind: `remediation_${finding.remediation.action}`,
      memo: `${finding.ruleId}: ${finding.remediation.label}`,
      postings: finding.remediation.postings,
    })
  }

  dashboard(): Dashboard {
    const s = this.state
    const balances = totalBalances(s)
    const { ownerRate, keystoneRate, failsafe } = splitYield(s.dfr)
    const units = s.persona.properties.length
    const perUnitTier = failsafe ? PRICING.flatFee : PRICING[s.persona.pricingTier]

    const saas = perUnitTier * 12
    const nim = failsafe ? 0 : Math.round((balances * keystoneRate) / units)
    const interchange = Math.round((s.persona.cardMonthlySpendCents * 12 * INTERCHANGE_RATE) / units)
    const annualRent = activeLeases(s, this.today).reduce((sum, l) => sum + l.monthlyRentCents, 0) * 12

    return {
      unitCount: units,
      balancesCents: balances,
      depositsCashCents: this.journal.balance(ACCOUNTS.segregatedDeposits),
      reservesCashCents: this.journal.balance(ACCOUNTS.segregatedReserves),
      operatingCents: this.journal.balance(ACCOUNTS.operating),
      arrearsCents: overdueReceivables(s, this.today),
      violations: this.findings().filter((f) => f.severity === 'violation').length,
      revenuePerUnit: { saas, nim, interchange, total: saas + nim + interchange },
      ownerYieldPerUnitCents: Math.round((balances * ownerRate) / units),
      noiAnnualCents: annualRent - s.persona.cardMonthlySpendCents * 12,
      pricingMode: failsafe ? 'flat_fee' : 'yield_shared',
      dfr: s.dfr,
    }
  }
}

/** Receivables past their SDD date (excludes the current month's not-yet-collected dues). */
function overdueReceivables(s: WorldState, today: string): number {
  let total = 0
  for (const [leaseId] of s.arrearsSince) {
    total += s.journal.balance(ACCOUNTS.rentReceivable(leaseId))
  }
  void today
  return total
}
