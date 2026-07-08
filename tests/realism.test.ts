import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildPersona } from '../src/engine/seed/personas'
import { paymentDayFor } from '../src/engine/simulators/realism'
import { spendOutliers } from '../src/engine/analytics'
import { parseISO } from '../src/engine/compliance/dates'

/**
 * Addendum D2 acceptance: the curated data must read as a real rental
 * operation — non-round amounts, scattered settlement with consistent
 * per-tenant personalities, lumpy seasonal spend, arrears arcs — while the
 * aggregates still reconcile (covered by reconciliation.test.ts, ±€1).
 */

const isRoundRent = (cents: number) => cents % 100 === 0 && (cents / 100) % 50 === 0

describe('D2 §2 — rent amounts & payment timing', () => {
  it('no round-number rents anywhere (€1,200 does not exist; €1,187 / €943.50 do)', () => {
    for (const id of ['a1-meridian', 'a2-sofia', 'a3-falkenrath', 'b1-haussmann', 'b2-rijnland', 'b3-ibervia']) {
      const persona = buildPersona(id)
      const round = persona.leases.filter((l) => isRoundRent(l.monthlyRentCents))
      expect(round.map((l) => l.id), id).toHaveLength(0)
      // Charges are a separate, smaller, non-round line.
      for (const lease of persona.leases) {
        expect(lease.chargesCents, lease.id).toBeGreaterThan(0)
        expect(lease.chargesCents, lease.id).toBeLessThan(lease.monthlyRentCents)
      }
    }
  })

  it('payment days vary per lease (1st/3rd/5th/10th — not all the 1st)', () => {
    const persona = buildPersona('b1-haussmann')
    const days = new Set(persona.leases.map((l) => paymentDayFor(l)))
    expect(days.size).toBeGreaterThanOrEqual(3)
    expect([...days].every((d) => d >= 1 && d <= 10)).toBe(true)
  })

  it('settlement scatters around the due date; the slow tenant is slow EVERY month', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    // Fold per-lease settlement lags: presentation (intent) → settlement.
    const intents = new Map(
      world.journal.all.filter((e) => e.kind === 'transfer_intent').map((e) => [e.id, e.date]),
    )
    const lagsByLease = new Map<string, number[]>()
    for (const event of world.journal.all) {
      if (event.kind !== 'transfer_settlement' || !event.ref) continue
      const presented = intents.get(event.ref)
      const leaseId = event.postings[0].dims.leaseId
      if (!presented || !leaseId) continue
      const lag = (parseISO(event.date).getTime() - parseISO(presented).getTime()) / 86_400_000
      lagsByLease.set(leaseId, [...(lagsByLease.get(leaseId) ?? []), lag])
    }
    const allLags = [...lagsByLease.values()].flat()
    expect(allLags.some((l) => l <= 1)).toBe(true) // same-day/early settlements exist
    expect(allLags.some((l) => l >= 3)).toBe(true) // and chronically-late ones

    // fr-p4 is pinned 'slow': consistently 3–8 days behind, month after month.
    const slow = lagsByLease.get('lease-fr-p4') ?? []
    expect(slow.length).toBeGreaterThanOrEqual(8)
    expect(slow.filter((l) => l >= 3).length / slow.length).toBeGreaterThan(0.7)
  })

  it('settlements avoid non-banking days (roll to the next business day)', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    for (const event of world.journal.all) {
      if (event.kind !== 'transfer_settlement') continue
      const dow = parseISO(event.date).getUTCDay()
      expect(dow, event.date).not.toBe(0)
      expect(dow, event.date).not.toBe(6)
    }
  })

  it('vacancy gap: es-p1 collects no rent during the 72-day summer void, then re-lets', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const dues = world.journal.all.filter(
      (e) => e.kind === 'rent_due' && e.postings[0].dims.propertyId === 'es-p1',
    )
    const gap = dues.filter((e) => e.date >= '2025-08-01' && e.date <= '2025-09-30')
    expect(gap).toHaveLength(0)
    expect(dues.some((e) => e.date < '2025-07-20')).toBe(true) // predecessor paid
    expect(dues.some((e) => e.date >= '2025-10-01')).toBe(true) // re-let pays
    // Predecessor deposit went back inside the clock.
    expect(
      world.journal.all.some(
        (e) => e.kind === 'deposit_returned' && e.date === '2025-08-01',
      ),
    ).toBe(true)
  })
})

describe('D2 §3/§5 — lumpy, seasonal spend & natural card feed', () => {
  it('spend is lumpy and seasonal, with at least one genuine capex/major spike', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const byMonth = new Map<string, number>()
    let biggest = 0
    for (const event of world.journal.all) {
      if (event.kind !== 'card_spend') continue
      const month = event.date.slice(0, 7)
      byMonth.set(month, (byMonth.get(month) ?? 0) + event.postings[0].amountCents)
      biggest = Math.max(biggest, event.postings[0].amountCents)
    }
    const totals = [...byMonth.values()]
    expect(totals.length).toBeGreaterThanOrEqual(12)
    expect(Math.max(...totals)).toBeGreaterThan(Math.min(...totals) * 1.5) // not a flat band
    expect(biggest).toBeGreaterThanOrEqual(150_000) // the €1.5k+ boiler/roof/renovation event
  })

  it('the utility anomaly exists IN THE DATA and the outlier detector finds it', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const flagged = world.journal.all.filter(
      (e) => e.kind === 'card_spend' && e.memo?.includes('estimated read'),
    )
    expect(flagged.length).toBeGreaterThanOrEqual(1)
    const outliers = spendOutliers(world)
    expect(outliers.length).toBeGreaterThanOrEqual(1)
    expect(outliers.some((o) => o.propertyId === flagged[0].postings[0].dims.propertyId)).toBe(true)
  })

  it('card transactions are non-round, merchant-appropriate, and timestamped', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const spends = world.journal.all.filter((e) => e.kind === 'card_spend')
    expect(spends.length).toBeGreaterThan(50)
    const roundEuro = spends.filter((e) => e.postings[0].amountCents % 100 === 0)
    expect(roundEuro.length / spends.length).toBeLessThan(0.1) // €47.80, €212.35 — not €200.00
    for (const event of spends.slice(0, 20)) {
      expect(event.meta?.time).toMatch(/^\d{2}:\d{2}$/) // time-of-day carried
      expect(event.memo).not.toMatch(/vendor \d/i) // real-sounding merchants
    }
    // Country-appropriate: Dutch property paid Dutch suppliers.
    const nlSpend = spends.filter((e) => e.postings[0].dims.propertyId?.startsWith('nl-'))
    expect(
      nlSpend.some((e) => /Eneco|Vattenfall|Waternet|Gamma|Praxis|Van Dam|De Groot|Mulder|CSU|Kone|Kiwa|Karwei|Smit/.test(e.memo ?? '')),
    ).toBe(true)
  })
})

describe('D2 §4 — arrears arcs, not uniform lateness', () => {
  it('A1 fr-p5 slid into arrears in October and RECOVERED by December', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const compensations = world.journal.all.filter(
      (e) =>
        e.kind === 'transfer_compensation' &&
        e.postings[0].dims.leaseId === 'lease-fr-p5',
    )
    expect(compensations.length).toBeGreaterThanOrEqual(1) // the missed month(s)
    const catchUp = world.journal.all.find(
      (e) => e.kind === 'tenant_payment' && e.postings[0].dims.leaseId === 'lease-fr-p5',
    )
    expect(catchUp?.date).toBe('2025-11-20') // partial payment mid-arc
    // Fully recovered: no open receivable, not in arrears at the epoch.
    expect(world.journal.balance('assets:receivables:rent:lease-fr-p5')).toBe(0)
    expect(world.dunningStage('lease-fr-p5')).toBe('current')
  })

  it('R-transaction reasons vary (AM04 / MD07 / MS02 / AC04), not one string', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    const reasons = new Set(
      world.journal.all
        .filter((e) => e.kind === 'transfer_compensation')
        .map((e) => e.memo?.match(/\((\w{2}\d{2})\)/)?.[1])
        .filter(Boolean),
    )
    expect(reasons.size).toBeGreaterThanOrEqual(2)
    expect(reasons.has('AM04')).toBe(true)
  })

  it('B2 social arrears: benefit portion lands on time while the tenant arc runs a payment plan', () => {
    const world = new DemoWorld(buildPersona('b2-rijnland'))
    // Benefit-paid leases exist and their state portion settles as its own intent.
    const benefit = world.journal.all.filter((e) => e.memo?.includes('Housing-benefit portion'))
    expect(benefit.length).toBeGreaterThan(100)
    // The payment-plan lease: partial catch-ups on record, still in arrears at epoch.
    const planLease = world.state.persona.leases[200].id
    const payments = world.journal.all.filter(
      (e) => e.kind === 'tenant_payment' && e.postings[0].dims.leaseId === planLease,
    )
    expect(payments.length).toBe(4)
    expect(world.dunningStage(planLease)).not.toBe('current')
  })
})

describe('G §3 — occupancy fluctuates over a real 12-month window', () => {
  it('B2 occupancy is computed from lease events and moves within a realistic band', async () => {
    const { occupancyTrend } = await import('../src/engine/analytics')
    const world = new DemoWorld(buildPersona('b2-rijnland'))
    const trend = occupancyTrend(world, 12)
    expect(trend).toHaveLength(12)
    const units = world.state.persona.properties.length
    const values = trend.map((t) => t.occupied)
    expect(new Set(values).size).toBeGreaterThanOrEqual(3) // rises and falls, not flat
    expect(Math.min(...values)).toBeGreaterThanOrEqual(Math.round(units * 0.9))
    expect(Math.max(...values)).toBeLessThanOrEqual(units)
  })
})

describe('D2 §6 — the year has shape', () => {
  it('the rent series shows the mid-year indexation step (fr-p2)', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const gross = (month: string) =>
      world.journal.all.find(
        (e) =>
          e.kind === 'rent_due' &&
          e.date.startsWith(month) &&
          e.postings[0].dims.leaseId === 'lease-fr-p2',
      )?.postings[0].amountCents
    expect(gross('2025-08')).toBeLessThan(gross('2025-09')!) // steps up once, on the date
    expect(gross('2025-09')).toBe(gross('2026-06')) // then holds flat
  })

  it('same seed → identical dataset every run (D2 determinism)', () => {
    const a = new DemoWorld(buildPersona('b3-ibervia'))
    const b = new DemoWorld(buildPersona('b3-ibervia'))
    expect(a.journal.all.length).toBe(b.journal.all.length)
    expect(JSON.stringify(a.journal.all.slice(-50))).toBe(JSON.stringify(b.journal.all.slice(-50)))
  })
})
