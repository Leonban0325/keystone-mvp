import { Journal, posting } from './ledger/journal'
import { ACCOUNTS, JournalEvent } from './ledger/types'
import { addDays } from './compliance/dates'
import { ownerYieldYtdCents, revenueRunRate } from './analytics'
import { DemoClock } from './simulators/clock'
import { BASE_DFR, PRICING, splitYield } from './simulators/economics'
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
import { DunningStage, Entity, PersonaSeed, Property, SeedLease } from './seed/types'

/** Distribution holdback: kept in owner_payable to cover card spend + arrears. */
const DISTRIBUTION_BUFFER_CENTS = 500_000

export interface RentRollRow {
  owner: string
  property: string
  city: string
  jurisdiction: SeedLease['jurisdiction']
  rentEur: number
  chargesEur: number
  depositEur: number
  tenant: string
  furnished: boolean
  startDate: string
}

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
  /** Leases created through the wizard (persona seed leases come from the builder). */
  extraLeases: SeedLease[]
  /** Entities/properties added by the rent-roll import wizard. */
  extraEntities: Entity[]
  extraProperties: Property[]
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
  /** Annualized revenue decomposition, cents per unit — folded from last month's ledger postings (§0). */
  revenuePerUnit: { saas: number; nim: number; interchange: number; total: number }
  ownerYieldPerUnitCents: number
  ownerYieldYtdCents: number
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
      leases: [...persona.leases, ...(snapshot?.extraLeases ?? [])],
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
    this.extraLeases = snapshot?.extraLeases ?? []
    this.extraEntities = snapshot?.extraEntities ?? []
    this.extraProperties = snapshot?.extraProperties ?? []
    persona.entities.push(...this.extraEntities)
    persona.properties.push(...this.extraProperties)
    this.clock = new DemoClock(snapshot?.today ?? persona.historyFrom)
    this.clock.onTick((day, isMonthStart) => this.tick(day, isMonthStart))
    if (!snapshot) {
      // The clock only ticks on advance — fire the opening day by hand so the
      // first history month gets its month-start events (rent due, fees).
      if (this.clock.today < persona.epoch) {
        this.tick(this.clock.today, this.clock.today.endsWith('-01'))
      }
      this.clock.advanceTo(persona.epoch)
    }
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
      extraLeases: this.extraLeases,
      extraEntities: this.extraEntities,
      extraProperties: this.extraProperties,
    }
  }

  private extraLeases: SeedLease[]
  private extraEntities: Entity[]
  private extraProperties: Property[]

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
    if (day.endsWith('-04')) this.postManagerFees(day)
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

  /**
   * Manager-of-owners personas (B1): the manager's fee is skimmed from each
   * owner's payable into the manager's own payable — three parties on one
   * ledger, all flowing through the same distribution waterfall.
   */
  private postManagerFees(day: string): void {
    const { managerFeePct, managerEntityId } = this.state.persona
    if (!managerFeePct || !managerEntityId) return
    for (const entity of this.state.persona.entities) {
      if (entity.id === managerEntityId) continue
      const gross = activeLeases(this.state, day)
        .filter((l) => l.entityId === entity.id)
        .reduce((sum, l) => sum + l.monthlyRentCents + l.chargesCents, 0)
      const fee = Math.round(gross * managerFeePct)
      if (fee <= 0) continue
      this.journal.append({
        id: this.journal.nextId(),
        date: day,
        kind: 'manager_fee',
        memo: `Management fee ${(managerFeePct * 100).toFixed(0)}% — ${entity.name}`,
        postings: [
          posting(ACCOUNTS.ownerPayable(entity.id), 'debit', fee, {
            entityId: entity.id,
            category: 'manager_fee',
          }),
          posting(ACCOUNTS.ownerPayable(managerEntityId), 'credit', fee, {
            entityId: managerEntityId,
            category: 'manager_fee',
          }),
        ],
      })
    }
  }

  /** Rent-roll CSV import (B1): onboards a new owner client as ledger events. */
  importRentRoll(rows: RentRollRow[]): { entityId: string; leases: number } {
    const ownerName = rows[0]?.owner ?? 'Imported owner'
    const slug = ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)
    let entity = this.state.persona.entities.find((e) => e.name === ownerName)
    if (!entity) {
      entity = { id: `ent-import-${slug}`, name: ownerName, kind: 'sci', country: 'FR' }
      this.extraEntities.push(entity)
      this.state.persona.entities.push(entity)
    }
    rows.forEach((row, i) => {
      const propertyId = `imp-${slug}-p${i + 1}`
      const property: Property = {
        id: propertyId,
        entityId: entity!.id,
        label: row.property,
        city: row.city,
        jurisdiction: row.jurisdiction,
      }
      this.extraProperties.push(property)
      this.state.persona.properties.push(property)
      const lease: SeedLease = {
        id: `lease-${propertyId}`,
        propertyId,
        entityId: entity!.id,
        jurisdiction: row.jurisdiction,
        furnished: row.furnished,
        monthlyRentCents: Math.round(row.rentEur * 100),
        chargesCents: Math.round(row.chargesEur * 100),
        depositCents: Math.round(row.depositEur * 100),
        startDate: row.startDate,
        tenantNames: [row.tenant],
      }
      this.extraLeases.push(lease)
      this.state.leases.push(lease)
      if (lease.depositCents > 0) {
        const dims = {
          entityId: entity!.id,
          propertyId,
          leaseId: lease.id,
          jurisdiction: row.jurisdiction,
          category: 'onboarding',
        }
        this.journal.append({
          id: this.journal.nextId(),
          date: this.today,
          kind: 'deposit_collected',
          memo: `Onboarding migration — ${row.property}`,
          postings: [
            posting(ACCOUNTS.segregatedDeposits, 'debit', lease.depositCents, dims),
            posting(ACCOUNTS.depositsHeld(lease.id), 'credit', lease.depositCents, dims),
          ],
        })
      }
    })
    return { entityId: entity.id, leases: rows.length }
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

  /** Add a lease created through the wizard; collects its deposit into segregation. */
  addLease(lease: SeedLease): void {
    this.extraLeases.push(lease)
    this.state.leases.push(lease)
    if (lease.depositCents > 0) {
      const dims = {
        entityId: lease.entityId,
        propertyId: lease.propertyId,
        leaseId: lease.id,
        jurisdiction: lease.jurisdiction,
        category: 'deposit',
      }
      this.journal.append({
        id: this.journal.nextId(),
        date: this.today,
        kind: 'deposit_collected',
        memo: `Deposit — new lease ${lease.id}`,
        postings: [
          posting(ACCOUNTS.segregatedDeposits, 'debit', lease.depositCents, dims),
          posting(ACCOUNTS.depositsHeld(lease.id), 'credit', lease.depositCents, dims),
        ],
      })
    }
  }

  /** Manually resolve one pending SDD collection (Money screen simulate buttons). */
  resolvePendingNow(intentId: string, outcome: 'settle' | 'fail'): void {
    const pending = this.state.pendingIntents.find((p) => p.intent.id === intentId)
    if (!pending) throw new Error(`No pending collection ${intentId}`)
    pending.fail = outcome === 'fail'
    pending.settleOn = this.today
    resolvePendingCollections(this.state, this.today)
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
    const { ownerRate, failsafe } = splitYield(s.dfr)
    const units = Math.max(1, s.persona.properties.length)

    // §0: revenue decomposition folds from the last complete month's income
    // postings, annualised — no hard-coded per-unit constants. The failsafe
    // flip is forward-looking, so SaaS shows the flat rate while it's active.
    const runRate = revenueRunRate(this)
    const saas = failsafe
      ? PRICING.flatFee * 12
      : Math.round(runRate.saasAnnualCents / units)
    const nim = failsafe ? 0 : Math.round(runRate.nimAnnualCents / units)
    const interchange = Math.round(runRate.interchangeAnnualCents / units)
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
      ownerYieldYtdCents: ownerYieldYtdCents(this),
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
