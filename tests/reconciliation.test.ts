import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildPersona, personaIds } from '../src/engine/seed/personas'
import { ACCOUNTS } from '../src/engine/ledger/types'
import { addMonths } from '../src/engine/compliance/dates'
import { complianceTrackRecord, monthlyFlows, moneyRollup, ownerYieldYtdCents, searchAll } from '../src/engine/analytics'

/**
 * Addendum B §0: every headline dashboard figure must fold from ledger
 * events. For each persona: dashboardTotals == sum(ledger projections)
 * within €1.
 */
describe('§0 dashboard ↔ ledger reconciliation (every persona)', () => {
  for (const id of personaIds()) {
    it(`${id}: dashboard folds from the journal within €1`, () => {
      const world = new DemoWorld(buildPersona(id))
      const d = world.dashboard()

      // Decomposition must sum to the per-unit total shown — exactly.
      expect(
        d.revenuePerUnit.saas +
          d.revenuePerUnit.nim +
          d.revenuePerUnit.interchange +
          d.revenuePerUnit.savings,
      ).toBe(d.revenuePerUnit.total)

      // Balances = segregated cash accounts, straight off the journal.
      expect(d.balancesCents).toBe(
        world.journal.balance(ACCOUNTS.segregatedDeposits) +
          world.journal.balance(ACCOUNTS.segregatedReserves),
      )

      // Revenue components = trailing-12-month income postings (signed fold).
      const windowEnd = world.today.slice(0, 8) + '01'
      const windowStart = addMonths(windowEnd, -12)
      const folds = { saas: 0, nim: 0, interchange: 0, savings: 0 }
      for (const event of world.journal.all) {
        if (event.date < windowStart || event.date >= windowEnd) continue
        for (const p of event.postings) {
          const signed = p.direction === 'credit' ? p.amountCents : -p.amountCents
          if (p.account === 'income:fees:saas') folds.saas += signed
          if (p.account === 'income:nim_share') folds.nim += signed
          if (p.account === 'income:fees:interchange') folds.interchange += signed
          if (p.account === 'income:fees:savings_share') folds.savings += signed
        }
      }
      const units = Math.max(1, world.state.persona.properties.length)
      expect(Math.abs(d.revenuePerUnit.saas * units - folds.saas)).toBeLessThanOrEqual(units)
      expect(Math.abs(d.revenuePerUnit.nim * units - folds.nim)).toBeLessThanOrEqual(units)
      expect(Math.abs(d.revenuePerUnit.interchange * units - folds.interchange)).toBeLessThanOrEqual(units)
      expect(Math.abs(d.revenuePerUnit.savings * units - folds.savings)).toBeLessThanOrEqual(units)

      // Owner yield YTD = accrued owner_payable yield postings since Jan 1.
      let ytd = 0
      const year = world.today.slice(0, 4)
      for (const event of world.journal.all) {
        if (event.kind !== 'yield_accrual' || !event.date.startsWith(year)) continue
        for (const p of event.postings) {
          if (p.direction === 'credit' && p.account.startsWith('liabilities:owner_payable:')) {
            ytd += p.amountCents
          }
        }
      }
      expect(d.ownerYieldYtdCents).toBe(ytd)
      expect(ownerYieldYtdCents(world)).toBe(ytd)
    })
  }

  it('per-segment revenue/unit matches the Revenue-by-Client model figures (§2.4, ±€1)', () => {
    const targets: Record<string, number> = {
      'a2-sofia': 17_700, // small landlord — €177
      'a1-meridian': 24_900, // mid landlord — €249
      'b1-haussmann': 20_300, // property manager — €203
      'b2-rijnland': 12_400, // housing association — €124
      'b3-ibervia': 26_400, // institutional BTR — €264
    }
    for (const [id, target] of Object.entries(targets)) {
      const d = new DemoWorld(buildPersona(id)).dashboard()
      expect(Math.abs(d.revenuePerUnit.total - target), id).toBeLessThanOrEqual(100)
    }
  })

  it('the curated year carries a compliance track record (§2.2)', () => {
    const b1 = new DemoWorld(buildPersona('b1-haussmann'))
    const record = complianceTrackRecord(b1)
    expect(record.resolved).toBeGreaterThanOrEqual(14)
    expect(record.avgDays).toBeGreaterThan(1)
    expect(record.avgDays).toBeLessThan(5)
  })
})

describe('money roll-up levels', () => {
  it('owner rows sum to the portfolio row (B1)', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    const portfolio = moneyRollup(world, 'portfolio')[0]
    const owners = moneyRollup(world, 'owner')
    const ownersIn = owners.reduce((s, r) => s + r.inCents, 0)
    expect(Math.abs(ownersIn - portfolio.inCents)).toBeLessThanOrEqual(100)
    expect(owners.length).toBe(43)
  })

  it('drills owner → property → lease', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    const owner = moneyRollup(world, 'owner').find((r) => r.inCents > 0)!
    const properties = moneyRollup(world, 'property', owner.id)
    expect(properties.length).toBeGreaterThan(0)
    const leases = moneyRollup(world, 'lease', properties[0].id)
    expect(leases.length).toBeGreaterThan(0)
  })
})

describe('cash-flow folds', () => {
  it('A1 monthly flows carry rent, spend and distributions', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const flows = monthlyFlows(world, 3)
    expect(flows).toHaveLength(3)
    const june = flows[2]
    expect(june.month).toBe('2026-06')
    expect(june.rentIn).toBeGreaterThan(0)
    expect(june.vendorOut).toBeGreaterThan(0)
    expect(june.distributions).toBeGreaterThan(0)
  })
})

describe('§5 savings engine v2', () => {
  it('A1 and B1 show ≥5 opportunities, all with logic trails and confidence', () => {
    for (const id of ['a1-meridian', 'b1-haussmann']) {
      const world = new DemoWorld(buildPersona(id))
      const opportunities = world.savingsOpportunities()
      expect(opportunities.length).toBeGreaterThanOrEqual(5)
      const detectors = new Set(opportunities.map((o) => o.detector))
      expect(detectors.size).toBe(5) // all five detectors fire
      for (const o of opportunities) {
        expect(o.logicTrail.length).toBeGreaterThan(10)
        expect(o.confidence).toBeGreaterThan(0.5)
        expect(o.confidence).toBeLessThanOrEqual(1)
      }
    }
  })

  it('A1 keeps the €379.20 tax appeal (the +€8,400 moment)', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const appeal = world.savingsOpportunities().find((o) => o.id === 'tax-appeal-fr-p1')!
    expect(appeal.savingsCents).toBe(37_920)
  })
})

describe('§6 global search', () => {
  it('resolves a tenant by name in the demo seed', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const hits = searchAll(world, 'camille')
    expect(hits.some((h) => h.type === 'tenant' && h.label.includes('Camille'))).toBe(true)
  })

  it('resolves owners and properties at B1 scale', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    expect(searchAll(world, 'haussmann').some((h) => h.type === 'owner')).toBe(true)
    expect(searchAll(world, 'paris').length).toBeGreaterThan(0)
  })
})
