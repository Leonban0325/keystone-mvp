import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildA1Meridian } from '../src/engine/seed/personas/a1-meridian'
import { splitYield, BASE_DFR } from '../src/engine/simulators/economics'
import { calculateRevision } from '../src/engine/indexation/calculator'

function world(): DemoWorld {
  return new DemoWorld(buildA1Meridian())
}

describe('A1 Meridian seed reconciliation (the deck numbers)', () => {
  it('is deterministic: two builds produce identical journals', () => {
    const a = world()
    const b = world()
    expect(JSON.stringify(a.journal.all)).toBe(JSON.stringify(b.journal.all))
  })

  it('presents at epoch 2026-07-01 with €125,000 under management', () => {
    const w = world()
    expect(w.today).toBe('2026-07-01')
    const d = w.dashboard()
    expect(d.balancesCents).toBe(12_500_000)
    expect(d.depositsCashCents).toBe(2_320_000)
    expect(d.reservesCashCents).toBe(10_180_000)
    expect(d.unitCount).toBe(10)
    expect(d.operatingCents).toBeGreaterThan(0)
  })

  it('revenue decomposition reconciles to €171–172/unit/yr at 2.25% DFR', () => {
    const d = world().dashboard()
    expect(d.dfr).toBe(BASE_DFR)
    expect(d.revenuePerUnit.saas).toBe(8_400)
    expect(d.revenuePerUnit.nim).toBe(7_594)
    expect(d.revenuePerUnit.interchange).toBe(1_200)
    expect(d.revenuePerUnit.total).toBeGreaterThanOrEqual(17_100)
    expect(d.revenuePerUnit.total).toBeLessThanOrEqual(17_200)
    expect(d.ownerYieldPerUnitCents).toBe(16_875) // ≈ €169 owner yield
  })

  it('shows exactly the seeded stories: 1 violation, lodgement warning, return clock, arrears', () => {
    const w = world()
    const findings = w.findings()

    const violations = findings.filter((f) => f.severity === 'violation')
    expect(violations).toHaveLength(1)
    expect(violations[0].ruleId).toBe('FR-DEP-CAP')
    expect(violations[0].leaseId).toBe('lease-fr-p3')
    expect(violations[0].remediation?.amountCents).toBe(20_000) // the €200 refund

    expect(findings.find((f) => f.ruleId === 'ES-FIANZA-LODGE')?.leaseId).toBe('lease-es-p1')

    const clock = findings.find((f) => f.ruleId === 'NL-DEP-RETURN')!
    expect(clock.leaseId).toBe('lease-nl-p1')
    expect(clock.meta!.deadline).toBe('2026-07-11')
    expect(clock.meta!.daysRemaining).toBe(10)

    expect(w.dunningStage('lease-es-p2')).toBe('payment_plan_offered')
    expect(w.dashboard().arrearsCents).toBeGreaterThanOrEqual(2 * 132_000)
  })

  it('one-click remediation closes the violation and moves real money', () => {
    const w = world()
    const finding = w.findings().find((f) => f.ruleId === 'FR-DEP-CAP')!
    w.applyRemediation(finding)
    expect(w.findings().filter((f) => f.severity === 'violation')).toHaveLength(0)
    expect(w.dashboard().depositsCashCents).toBe(2_300_000)
  })
})

describe('clock-driven simulators', () => {
  it('advancing past the NL deadline turns the return clock into a violation', () => {
    const w = world()
    w.advanceDays(15) // 2026-07-16, deadline was 07-11
    const f = w.findings().find((x) => x.ruleId === 'NL-DEP-RETURN')!
    expect(f.severity).toBe('violation')
  })

  it('forced R-transaction starts the dunning FSM with visible compensation events', () => {
    const w = world()
    w.forceRTransaction('lease-fr-p1')
    // July rent is already due; SDD fires on the 3rd, R-fails on the 5th,
    // and 6+ days into arrears the FSM reaches reminder_sent.
    w.advanceDays(10) // → 2026-07-11
    expect(w.dunningStage('lease-fr-p1')).toBe('reminder_sent')
    const compensations = w.journal.all.filter(
      (e) => e.kind === 'transfer_compensation' && e.memo?.includes('AM04'),
    )
    expect(compensations.length).toBeGreaterThan(0)
  })

  it('a year of clock advancing keeps every invariant green', () => {
    const w = world()
    expect(() => w.advanceMonths(12)).not.toThrow()
    expect(w.dashboard().balancesCents).toBeGreaterThan(0)
  })
})

describe('yield failsafe', () => {
  it('keystone take is 60.75 bps at the 2.25% base rate, no failsafe', () => {
    const split = splitYield(0.0225)
    expect(split.failsafe).toBe(false)
    expect(Math.round(split.keystoneRate * 1_000_000)).toBe(6_075) // 60.75 bps
    expect(Math.round(split.bankRate * 1_000_000)).toBe(2_925) // 29.25 bps
  })

  it('fires below ~0.93% DFR and flips pricing to flat-fee mode', () => {
    expect(splitYield(0.0095).failsafe).toBe(false)
    expect(splitYield(0.009).failsafe).toBe(true)
    expect(splitYield(0).failsafe).toBe(true)

    const w = world()
    w.setDfr(0.005)
    expect(w.dashboard().pricingMode).toBe('flat_fee')
    w.advanceMonths(1)
    const flatFees = w.journal.all.filter((e) => e.kind === 'saas_fee_flat')
    expect(flatFees.length).toBe(1)
  })
})

describe('indexation', () => {
  it('computes the permitted IRL revision for the fr-p6 lease', () => {
    const lease = buildA1Meridian().leases.find((l) => l.id === 'lease-fr-p6')!
    const revision = calculateRevision(lease)!
    expect(revision.index).toBe('IRL')
    expect(revision.currentValue).toBe(148.97)
    expect(revision.newRentCents).toBe(Math.round((100_000 * 148.97) / 146.79))
    expect(revision.increaseCents).toBeGreaterThan(0)
    expect(revision.noticeText).toContain('Révision annuelle du loyer')
  })
})
