import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildPersona, personaIds } from '../src/engine/seed/personas'
import { ACCOUNTS } from '../src/engine/ledger/types'
import { addMonths } from '../src/engine/compliance/dates'
import { monthlyFlows, moneyRollup, ownerYieldYtdCents, searchAll } from '../src/engine/analytics'

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
      expect(d.revenuePerUnit.saas + d.revenuePerUnit.nim + d.revenuePerUnit.interchange).toBe(
        d.revenuePerUnit.total,
      )

      // Balances = segregated cash accounts, straight off the journal.
      expect(d.balancesCents).toBe(
        world.journal.balance(ACCOUNTS.segregatedDeposits) +
          world.journal.balance(ACCOUNTS.segregatedReserves),
      )

      // Revenue components = last complete month's income postings × 12.
      const lastMonth = addMonths(world.today.slice(0, 8) + '01', -1).slice(0, 7)
      let saasMonth = 0
      let nimMonth = 0
      let interchangeMonth = 0
      for (const event of world.journal.all) {
        if (!event.date.startsWith(lastMonth)) continue
        for (const p of event.postings) {
          if (p.direction !== 'credit') continue
          if (p.account === 'income:fees:saas') saasMonth += p.amountCents
          if (p.account === 'income:nim_share') nimMonth += p.amountCents
          if (p.account === 'income:fees:interchange') interchangeMonth += p.amountCents
        }
      }
      const units = Math.max(1, world.state.persona.properties.length)
      expect(Math.abs(d.revenuePerUnit.saas * units - saasMonth * 12)).toBeLessThanOrEqual(
        100 * units,
      )
      expect(Math.abs(d.revenuePerUnit.nim * units - nimMonth * 12)).toBeLessThanOrEqual(100 * units)
      expect(
        Math.abs(d.revenuePerUnit.interchange * units - interchangeMonth * 12),
      ).toBeLessThanOrEqual(100 * units)

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

  it('A1 still shows the deck numbers, now as ledger folds', () => {
    const d = new DemoWorld(buildPersona('a1-meridian')).dashboard()
    expect(d.revenuePerUnit.saas).toBe(8_400)
    expect(d.revenuePerUnit.nim).toBe(7_594)
    expect(d.revenuePerUnit.interchange).toBe(1_200)
    expect(d.revenuePerUnit.total).toBe(17_194)
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
