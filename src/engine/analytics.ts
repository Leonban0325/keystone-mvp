import type { DemoWorld } from './world'
import { ACCOUNTS } from './ledger/types'
import { addDays, addMonths, daysBetween } from './compliance/dates'

/**
 * Addendum B selectors: every widget is a query/fold over the existing
 * ledger — new views, not new data sources. All money integer cents.
 */

// ── time helpers ─────────────────────────────────────────────────────────────

export function monthKey(date: string): string {
  return date.slice(0, 7)
}

/** Last n month keys ending with the month BEFORE today's (complete months). */
export function lastFullMonths(today: string, n: number): string[] {
  const keys: string[] = []
  for (let i = n; i >= 1; i -= 1) {
    keys.push(monthKey(addMonths(today.slice(0, 8) + '01', -i)))
  }
  return keys
}

// ── §0/§2.4 revenue: trailing-12-month income postings, an actual fold ───────

export interface RevenueRunRate {
  saasAnnualCents: number
  nimAnnualCents: number
  interchangeAnnualCents: number
  savingsShareAnnualCents: number
}

/**
 * Trailing 12 complete months of income postings. With the curated 12-month
 * dataset this IS the annual actual — the number the per-segment
 * Revenue-by-Client targets are asserted against.
 */
export function revenueRunRate(world: DemoWorld): RevenueRunRate {
  const windowEnd = world.today.slice(0, 8) + '01' // exclusive: current month
  const windowStart = addMonths(windowEnd, -12)
  let saas = 0
  let nim = 0
  let interchange = 0
  let savings = 0
  for (const event of world.journal.all) {
    if (event.date < windowStart || event.date >= windowEnd) continue
    for (const p of event.postings) {
      // Income is credit-normal: fold signed so rebates/contras net off.
      const signed = p.direction === 'credit' ? p.amountCents : -p.amountCents
      if (p.account === ACCOUNTS.feeIncome('saas')) saas += signed
      else if (p.account === ACCOUNTS.nimShare) nim += signed
      else if (p.account === ACCOUNTS.feeIncome('interchange')) interchange += signed
      else if (p.account === ACCOUNTS.feeIncome('savings_share')) savings += signed
    }
  }
  return {
    saasAnnualCents: saas,
    nimAnnualCents: nim,
    interchangeAnnualCents: interchange,
    savingsShareAnnualCents: savings,
  }
}

/** §2.2 compliance track record: findings resolved over the year, from remediation events. */
export function complianceTrackRecord(world: DemoWorld): { resolved: number; avgDays: number } {
  let resolved = 0
  let daysTotal = 0
  let dated = 0
  for (const event of world.journal.all) {
    if (!event.kind.startsWith('remediation_')) continue
    resolved += 1
    const raisedOn = event.meta?.raisedOn
    if (raisedOn) {
      daysTotal += daysBetween(raisedOn, event.date)
      dated += 1
    }
  }
  return { resolved, avgDays: dated ? daysTotal / dated : 0 }
}

/** Owner yield credited since Jan 1 of the demo year — a fold, not a guess. */
export function ownerYieldYtdCents(world: DemoWorld): number {
  const year = world.today.slice(0, 4)
  let total = 0
  for (const event of world.journal.all) {
    if (event.kind !== 'yield_accrual' || !event.date.startsWith(year)) continue
    for (const p of event.postings) {
      if (p.direction === 'credit' && p.account.startsWith('liabilities:owner_payable:')) {
        total += p.amountCents
      }
    }
  }
  return total
}

// ── cash-flow over time (hero chart) ─────────────────────────────────────────

export interface MonthlyFlow {
  month: string
  rentIn: number
  vendorOut: number
  feesOut: number
  distributions: number
  reserveMoves: number
}

export interface FlowScope {
  entityId?: string
  propertyId?: string
  leaseId?: string
}

export function monthlyFlows(world: DemoWorld, months: number, scope?: FlowScope): MonthlyFlow[] {
  const keys = lastFullMonths(world.today, months)
  const rows = new Map<string, MonthlyFlow>(
    keys.map((k) => [
      k,
      { month: k, rentIn: 0, vendorOut: 0, feesOut: 0, distributions: 0, reserveMoves: 0 },
    ]),
  )
  const inScope = (event: (typeof world.journal.all)[number]) =>
    !scope ||
    event.postings.some(
      (p) =>
        (!scope.entityId || p.dims.entityId === scope.entityId) &&
        (!scope.propertyId || p.dims.propertyId === scope.propertyId) &&
        (!scope.leaseId || p.dims.leaseId === scope.leaseId),
    )

  for (const event of world.journal.all) {
    const row = rows.get(monthKey(event.date))
    if (!row || !inScope(event)) continue
    const amount = event.postings
      .filter((p) => p.direction === 'debit')
      .reduce((s, p) => s + p.amountCents, 0)
    switch (event.kind) {
      case 'transfer_settlement':
        row.rentIn += amount
        break
      case 'card_spend':
        row.vendorOut += amount
        break
      case 'saas_fee':
      case 'saas_fee_flat':
      case 'manager_fee':
      case 'savings_success_fee':
        row.feesOut += amount
        break
      case 'owner_distribution':
        row.distributions += amount
        break
      case 'reserve_funding':
        row.reserveMoves += amount
        break
    }
  }
  return [...rows.values()]
}

/** 6-month rent-collected sparkline values for one scope. */
export function rentSparkline(world: DemoWorld, scope: FlowScope): number[] {
  return monthlyFlows(world, 6, scope).map((m) => m.rentIn)
}

// ── PM widgets ───────────────────────────────────────────────────────────────

export interface AgingBucket {
  label: string
  amountCents: number
  count: number
}

export function arrearsAging(world: DemoWorld): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: '0–30', amountCents: 0, count: 0 },
    { label: '31–60', amountCents: 0, count: 0 },
    { label: '61–90', amountCents: 0, count: 0 },
    { label: '90+', amountCents: 0, count: 0 },
  ]
  for (const [leaseId, since] of world.state.arrearsSince) {
    const amount = world.journal.balance(ACCOUNTS.rentReceivable(leaseId))
    if (amount <= 0) continue
    const days = daysBetween(since, world.today)
    const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
    buckets[bucket].amountCents += amount
    buckets[bucket].count += 1
  }
  return buckets
}

export function payoutRun(world: DemoWorld): { done: number; total: number; pending: string[] } {
  const persona = world.state.persona
  const owners = persona.entities.filter((e) => e.id !== persona.managerEntityId)
  const month = monthKey(world.today)
  const paid = new Set<string>()
  for (const event of world.journal.all) {
    if (event.kind === 'owner_distribution' && monthKey(event.date) === month) {
      const entityId = event.postings[0]?.dims.entityId
      if (entityId) paid.add(entityId)
    }
  }
  const pending = owners.filter((o) => !paid.has(o.id)).map((o) => o.name)
  return { done: owners.length - pending.length, total: owners.length, pending: pending.slice(0, 6) }
}

export function findingsByCountry(
  world: DemoWorld,
): { jurisdiction: string; violations: number; warnings: number }[] {
  const map = new Map<string, { violations: number; warnings: number }>()
  for (const finding of world.findings()) {
    if (finding.severity === 'info') continue
    const lease = world.state.leases.find((l) => l.id === finding.leaseId)
    if (!lease) continue
    const row = map.get(lease.jurisdiction) ?? { violations: 0, warnings: 0 }
    if (finding.severity === 'violation') row.violations += 1
    else row.warnings += 1
    map.set(lease.jurisdiction, row)
  }
  return [...map.entries()]
    .map(([jurisdiction, counts]) => ({ jurisdiction, ...counts }))
    .sort((a, b) => b.violations - a.violations)
}

export interface LeaseEvent {
  date: string
  type: 'move-out' | 'indexation' | 'renewal'
  label: string
  leaseId: string
}

/** Renewals, indexations, move-outs due in the next `days`. */
export function upcomingLeaseEvents(world: DemoWorld, days = 60): LeaseEvent[] {
  const horizon = addDays(world.today, days)
  const events: LeaseEvent[] = []
  const label = (leaseId: string) => {
    const lease = world.state.leases.find((l) => l.id === leaseId)
    const property = world.state.persona.properties.find((p) => p.id === lease?.propertyId)
    return property?.label ?? leaseId
  }
  const nextAnniversary = (date: string): string => {
    const monthDay = date.slice(4)
    let anniversary = world.today.slice(0, 4) + monthDay
    if (anniversary < world.today) {
      anniversary = String(Number(world.today.slice(0, 4)) + 1) + monthDay
    }
    return anniversary
  }
  for (const lease of world.state.leases) {
    if (lease.moveOutDate && lease.moveOutDate >= world.today && lease.moveOutDate <= horizon) {
      events.push({ date: lease.moveOutDate, type: 'move-out', label: label(lease.id), leaseId: lease.id })
    }
    if (lease.indexation) {
      const due = nextAnniversary(lease.indexation.lastRevised)
      if (due <= horizon) {
        events.push({ date: due, type: 'indexation', label: label(lease.id), leaseId: lease.id })
      }
    }
    if (!lease.moveOutDate) {
      const renewal = nextAnniversary(lease.startDate)
      if (renewal <= horizon) {
        events.push({ date: renewal, type: 'renewal', label: label(lease.id), leaseId: lease.id })
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
}

// ── owner widgets ────────────────────────────────────────────────────────────

export function nextPayout(world: DemoWorld): { date: string; amountCents: number } {
  const base = world.today.slice(0, 8) + '05'
  const date = base >= world.today ? base : addMonths(base, 1)
  const BUFFER = 500_000
  let amount = 0
  for (const entity of world.state.persona.entities) {
    amount += Math.max(0, world.journal.balance(ACCOUNTS.ownerPayable(entity.id)) - BUFFER)
  }
  return { date, amountCents: amount }
}

export function rentDueNext30(world: DemoWorld): { expectedCents: number; atRiskCents: number } {
  let expected = 0
  let atRisk = 0
  for (const lease of world.state.leases) {
    if (lease.moveOutDate && lease.moveOutDate <= world.today) continue
    const gross = lease.monthlyRentCents + lease.chargesCents
    expected += gross
    if (world.dunningStage(lease.id) !== 'current') atRisk += gross
  }
  return { expectedCents: expected, atRiskCents: atRisk }
}

// ── NOI bridge (hero chart) ───────────────────────────────────────────────────

export interface BridgeStep {
  label: string
  delta: number
  total: number
}

export function noiBridge(world: DemoWorld): BridgeStep[] {
  const active = world.state.leases.filter((l) => !l.moveOutDate || l.moveOutDate > world.today)
  const rent = active.reduce((s, l) => s + l.monthlyRentCents, 0) * 12
  // H §3.2: opex is the ACTUAL trailing-12-month spend fold, not a budget scalar.
  const opex = trailingSpendCents(world)
  const savings = world
    .savingsOpportunities()
    .filter((o) => o.executed && o.kind === 'recurring')
    .reduce((s, o) => s + o.savingsCents, 0)
  const steps: BridgeStep[] = []
  let running = 0
  const push = (label: string, delta: number) => {
    running += delta
    steps.push({ label, delta, total: running })
  }
  push('Rent roll', rent)
  push('Opex (card-routed)', -opex)
  if (savings > 0) push('Savings executed', savings)
  steps.push({ label: 'NOI', delta: running, total: running })
  return steps
}

/** Trailing-12-month card/vendor spend, folded from the journal (H §3.2). */
export function trailingSpendCents(world: DemoWorld): number {
  const windowEnd = world.today.slice(0, 8) + '01'
  const windowStart = addMonths(windowEnd, -12)
  let total = 0
  for (const event of world.journal.all) {
    if (event.kind === 'card_spend' && event.date >= windowStart && event.date < windowEnd) {
      total += event.postings[0].amountCents
    }
  }
  return total
}

// ── institution widgets ──────────────────────────────────────────────────────

export function occupancyTrend(world: DemoWorld, months = 6): { month: string; occupied: number }[] {
  const keys = lastFullMonths(world.today, months)
  return keys.map((key) => {
    const monthEnd = key + '-28'
    const occupied = world.state.leases.filter(
      (l) => l.startDate <= monthEnd && (!l.moveOutDate || l.moveOutDate > monthEnd),
    ).length
    return { month: key, occupied }
  })
}

export function lodgementCompleteness(world: DemoWorld): { done: number; total: number } | null {
  const esLeases = world.state.leases.filter(
    (l) => l.jurisdiction === 'ES' && (!l.moveOutDate || l.moveOutDate > world.today),
  )
  if (esLeases.length === 0) return null
  return {
    done: esLeases.filter((l) => l.lodgementCertificate).length,
    total: esLeases.length,
  }
}

// ── Card & Spend analytics ───────────────────────────────────────────────────

export function spendByCategory(world: DemoWorld): { category: string; amountCents: number }[] {
  const map = new Map<string, number>()
  for (const event of world.journal.all) {
    if (event.kind !== 'card_spend') continue
    const category = (event.postings[0].dims.category ?? 'card:other').replace('card:', '')
    map.set(category, (map.get(category) ?? 0) + event.postings[0].amountCents)
  }
  return [...map.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
}

export function spendByProperty(world: DemoWorld, top = 10): { propertyId: string; label: string; amountCents: number }[] {
  const map = new Map<string, number>()
  for (const event of world.journal.all) {
    if (event.kind !== 'card_spend') continue
    const pid = event.postings[0].dims.propertyId ?? '—'
    map.set(pid, (map.get(pid) ?? 0) + event.postings[0].amountCents)
  }
  return [...map.entries()]
    .map(([propertyId, amountCents]) => ({
      propertyId,
      label:
        world.state.persona.properties.find((p) => p.id === propertyId)?.label ?? propertyId,
      amountCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, top)
}

export function spendTrend(world: DemoWorld, months = 12): { month: string; amountCents: number }[] {
  const flows = monthlyFlows(world, months)
  return flows.map((f) => ({ month: f.month, amountCents: f.vendorOut }))
}

export interface SpendOutlier {
  propertyId: string
  label: string
  category: string
  lastMonthCents: number
  trailingMeanCents: number
  ratio: number
}

/** Properties whose last-month spend > 2× their trailing mean — savings-engine candidates. */
export function spendOutliers(world: DemoWorld): SpendOutlier[] {
  const byPropertyMonth = new Map<string, Map<string, { amount: number; category: string }>>()
  for (const event of world.journal.all) {
    if (event.kind !== 'card_spend') continue
    const pid = event.postings[0].dims.propertyId
    if (!pid) continue
    const month = monthKey(event.date)
    const inner = byPropertyMonth.get(pid) ?? new Map()
    const cell = inner.get(month) ?? { amount: 0, category: '' }
    cell.amount += event.postings[0].amountCents
    cell.category = (event.postings[0].dims.category ?? '').replace('card:', '')
    inner.set(month, cell)
    byPropertyMonth.set(pid, inner)
  }
  const lastMonth = monthKey(addMonths(world.today.slice(0, 8) + '01', -1))
  const outliers: SpendOutlier[] = []
  for (const [pid, byMonth] of byPropertyMonth) {
    const last = byMonth.get(lastMonth)
    if (!last) continue
    const prior = [...byMonth.entries()].filter(([m]) => m < lastMonth).map(([, c]) => c.amount)
    if (prior.length === 0) continue
    const mean = prior.reduce((s, v) => s + v, 0) / prior.length
    // Require a stable baseline (≥€50/mo trailing): a property with near-zero
    // history and one repair is normal lumpiness, not an outlier.
    if (mean > 5_000 && last.amount > 2 * mean) {
      outliers.push({
        propertyId: pid,
        label: world.state.persona.properties.find((p) => p.id === pid)?.label ?? pid,
        category: last.category,
        lastMonthCents: last.amount,
        trailingMeanCents: Math.round(mean),
        ratio: last.amount / mean,
      })
    }
  }
  return outliers.sort((a, b) => b.ratio - a.ratio).slice(0, 5)
}

// ── Money roll-up (portfolio → owner → property → lease) ─────────────────────

export interface RollupRow {
  id: string
  label: string
  inCents: number
  outCents: number
  netCents: number
  balanceCents: number
  children?: 'owner' | 'property' | 'lease'
}

export type RollupLevel = 'portfolio' | 'owner' | 'property' | 'lease'

export function moneyRollup(world: DemoWorld, level: RollupLevel, parentId?: string): RollupRow[] {
  const persona = world.state.persona
  const dimOf = (level: RollupLevel) =>
    level === 'owner' ? 'entityId' : level === 'property' ? 'propertyId' : 'leaseId'

  const groups = new Map<string, { inCents: number; outCents: number }>()
  const bump = (key: string | undefined, field: 'inCents' | 'outCents', amount: number) => {
    if (!key) return
    const row = groups.get(key) ?? { inCents: 0, outCents: 0 }
    row[field] += amount
    groups.set(key, row)
  }

  for (const event of world.journal.all) {
    const amount = event.postings
      .filter((p) => p.direction === 'debit')
      .reduce((s, p) => s + p.amountCents, 0)
    const dims = event.postings.map((p) => p.dims).find((d) => Object.keys(d).length > 0) ?? {}
    const key =
      level === 'portfolio' ? 'portfolio' : (dims[dimOf(level)] as string | undefined)
    if (level === 'owner' && parentId && dims.entityId !== parentId) continue
    if (level === 'property' && parentId && dims.entityId !== parentId) continue
    if (level === 'lease' && parentId && dims.propertyId !== parentId) continue

    switch (event.kind) {
      case 'transfer_settlement':
      case 'deposit_collected':
      case 'reserve_funding':
        bump(key, 'inCents', amount)
        break
      case 'card_spend':
      case 'saas_fee':
      case 'saas_fee_flat':
      case 'manager_fee':
      case 'owner_distribution':
      case 'deposit_returned':
      case 'remediation_refund_excess':
        bump(key, 'outCents', amount)
        break
    }
  }

  const balanceOf = (level: RollupLevel, id: string): number => {
    if (level === 'portfolio') return world.dashboard().balancesCents
    if (level === 'owner') {
      let total = world.journal.balance(`liabilities:reserves_held:${id}`)
      total += world.journal.balance(ACCOUNTS.ownerPayable(id))
      for (const lease of world.state.leases) {
        if (lease.entityId === id) total += world.journal.balance(ACCOUNTS.depositsHeld(lease.id))
      }
      return total
    }
    if (level === 'property') {
      let total = 0
      for (const lease of world.state.leases) {
        if (lease.propertyId === id) total += world.journal.balance(ACCOUNTS.depositsHeld(lease.id))
      }
      return total
    }
    return world.journal.balance(ACCOUNTS.depositsHeld(id))
  }

  const labelOf = (level: RollupLevel, id: string): string => {
    if (level === 'portfolio') return 'Whole portfolio'
    if (level === 'owner') return persona.entities.find((e) => e.id === id)?.name ?? id
    if (level === 'property') return persona.properties.find((p) => p.id === id)?.label ?? id
    const lease = world.state.leases.find((l) => l.id === id)
    return lease ? `${lease.tenantNames.join(', ')} — ${id}` : id
  }

  const ids =
    level === 'portfolio'
      ? ['portfolio']
      : level === 'owner'
        ? persona.entities.map((e) => e.id)
        : level === 'property'
          ? persona.properties.filter((p) => !parentId || p.entityId === parentId).map((p) => p.id)
          : world.state.leases.filter((l) => !parentId || l.propertyId === parentId).map((l) => l.id)

  return ids
    .map((id) => {
      const flows = groups.get(id) ?? { inCents: 0, outCents: 0 }
      return {
        id,
        label: labelOf(level, id),
        inCents: flows.inCents,
        outCents: flows.outCents,
        netCents: flows.inCents - flows.outCents,
        balanceCents: balanceOf(level, id),
        children:
          level === 'portfolio'
            ? ('owner' as const)
            : level === 'owner'
              ? ('property' as const)
              : level === 'property'
                ? ('lease' as const)
                : undefined,
      }
    })
    .sort((a, b) => b.inCents - a.inCents)
}

// ── §6 global search ─────────────────────────────────────────────────────────

export interface SearchHit {
  type: 'tenant' | 'property' | 'owner' | 'lease'
  label: string
  sub: string
  leaseId?: string
  propertyId?: string
  entityId?: string
}

export function searchAll(world: DemoWorld, query: string, limit = 10): SearchHit[] {
  const q = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (q.length < 2) return []
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const hits: SearchHit[] = []
  const persona = world.state.persona

  for (const entity of persona.entities) {
    if (norm(entity.name).includes(q)) {
      hits.push({ type: 'owner', label: entity.name, sub: 'owner client', entityId: entity.id })
    }
  }
  for (const property of persona.properties) {
    if (norm(`${property.label} ${property.city}`).includes(q)) {
      hits.push({
        type: 'property',
        label: property.label,
        sub: property.city,
        propertyId: property.id,
        entityId: property.entityId,
      })
    }
  }
  for (const lease of world.state.leases) {
    if (norm(lease.id).includes(q)) {
      hits.push({ type: 'lease', label: lease.id, sub: lease.tenantNames.join(', '), leaseId: lease.id, propertyId: lease.propertyId })
    }
    for (const tenant of lease.tenantNames) {
      if (norm(tenant).includes(q)) {
        const property = persona.properties.find((p) => p.id === lease.propertyId)
        hits.push({
          type: 'tenant',
          label: tenant,
          sub: property?.label ?? lease.id,
          leaseId: lease.id,
          propertyId: lease.propertyId,
        })
      }
    }
    if (hits.length > limit * 3) break
  }
  return hits.slice(0, limit)
}
