import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildPersona, personaIds } from '../src/engine/seed/personas'

describe('persona catalog', () => {
  it('every persona builds and replays without invariant violations', () => {
    for (const id of personaIds()) {
      const world = new DemoWorld(buildPersona(id))
      expect(world.today).toBe('2026-07-01')
      expect(() => world.dashboard()).not.toThrow()
    }
  })

  it('B1: 42 owner clients + manager, 850 units, 7% manager fee flows on the ledger', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    const persona = world.state.persona
    expect(persona.entities.length).toBe(43) // 42 owners + Gestion Haussmann
    expect(persona.properties.length).toBe(850)
    const fees = world.journal.all.filter((e) => e.kind === 'manager_fee')
    expect(fees.length).toBeGreaterThanOrEqual(42) // at least one month of fees
    expect(world.journal.balance('liabilities:owner_payable:ent-haussmann')).toBeGreaterThanOrEqual(0)
    // 3 owners carry open findings for the roll-up red dots
    const findings = world.findings().filter((f) => f.severity === 'violation')
    const owners = new Set(
      findings.map((f) => world.state.leases.find((l) => l.id === f.leaseId)?.entityId),
    )
    expect(owners.size).toBeGreaterThanOrEqual(3)
  })

  it('B1: rent-roll import commits onboarding events for a new owner', () => {
    const world = new DemoWorld(buildPersona('b1-haussmann'))
    const before = world.journal.all.length
    const result = world.importRentRoll([
      { owner: 'Cabinet Morel', property: '4 rue des Pyrénées', city: 'Paris 20e', jurisdiction: 'FR', rentEur: 980, chargesEur: 90, depositEur: 980, tenant: 'A. Petit', furnished: false, startDate: '2026-07-01' },
      { owner: 'Cabinet Morel', property: '11 rue de Ménilmontant', city: 'Paris 20e', jurisdiction: 'FR', rentEur: 1240, chargesEur: 110, depositEur: 2480, tenant: 'B. Roche', furnished: true, startDate: '2026-07-01' },
    ])
    expect(result.leases).toBe(2)
    expect(world.journal.all.length).toBe(before + 2)
    expect(world.state.persona.entities.some((e) => e.name === 'Cabinet Morel')).toBe(true)
    // survives snapshot round-trip
    const revived = new DemoWorld(buildPersona('b1-haussmann'), world.snapshot())
    expect(revived.state.persona.entities.some((e) => e.name === 'Cabinet Morel')).toBe(true)
    expect(revived.state.leases.length).toBe(853) // 850 + re-let + 2 imported
  })

  it('A3: DE ruleset evaluates — tenant interest accrues, lump-sum demand flagged', () => {
    const world = new DemoWorld(buildPersona('a3-falkenrath'))
    const findings = world.findings()
    expect(findings.some((f) => f.ruleId === 'DE-KAUTION-INSTALMENTS' && f.severity === 'violation')).toBe(true)
    const interest = findings.filter((f) => f.ruleId === 'DE-KAUTION-INTEREST')
    expect(interest.length).toBeGreaterThan(0)
    expect(interest.every((f) => f.severity === 'info')).toBe(true) // accrual is running
    expect(world.journal.balanceUnder('liabilities:tenant_interest_accrued')).toBeGreaterThan(0)
  })

  it('A2: flat-share dunning targets only the late co-tenant', () => {
    const world = new DemoWorld(buildPersona('a2-sofia'))
    expect(world.dunningStage('lease-sj-p3')).not.toBe('current')
    expect(world.dunningStage('lease-sj-p1')).toBe('current')
    const arrears = world.journal.balance('assets:receivables:rent:lease-sj-p3')
    expect(arrears).toBeGreaterThan(0)
  })

  it('C1: partner console dataset is complete', () => {
    const persona = buildPersona('c1-rentora')
    expect(persona.partner?.funnel?.eligible).toBe(60_000)
    expect(persona.partner?.funnel?.activated).toBe(4_200)
    expect(persona.partner?.apiKeys?.length).toBe(2)
    expect(persona.partner?.revShare?.activatedUnits).toBe(4_200)
  })

  it('switching back to A1 still reconciles to €249/unit on €125k balances', () => {
    new DemoWorld(buildPersona('b1-haussmann'))
    new DemoWorld(buildPersona('c1-rentora'))
    const a1 = new DemoWorld(buildPersona('a1-meridian'))
    const d = a1.dashboard()
    expect(d.balancesCents).toBe(12_500_000)
    expect(Math.abs(d.revenuePerUnit.total - 24_900)).toBeLessThanOrEqual(100)
    expect(d.ownerYieldPerUnitCents).toBe(16_875)
  })
})
