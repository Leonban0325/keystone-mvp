import { describe, expect, it } from 'vitest'
import { Journal } from '../src/engine/ledger/journal'
import { complianceView, evaluateLease } from '../src/engine/compliance/evaluator'
import { RULESETS } from '../src/engine/compliance/rulesets'
import { collectDeposit, makeLease } from './helpers'

const NL = RULESETS.get('NL')!

describe('NL statutory pack (Wet goed verhuurderschap)', () => {
  it('deposit at exactly 2 months is compliant (furnished or not)', () => {
    for (const furnished of [false, true]) {
      const journal = new Journal()
      const lease = makeLease({
        id: 'NL1',
        jurisdiction: 'NL',
        furnished,
        monthlyRentCents: 150_000,
        depositCents: 300_000,
      })
      collectDeposit(journal, lease)
      const findings = evaluateLease(lease, complianceView(journal), NL, '2026-01-15')
      expect(findings.find((f) => f.ruleId === 'NL-DEP-CAP')).toBeUndefined()
    }
  })

  it('deposit over 2 months → violation with prepared refund of the excess', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'NL2',
      jurisdiction: 'NL',
      monthlyRentCents: 150_000,
      depositCents: 350_000,
    })
    collectDeposit(journal, lease)
    const f = evaluateLease(lease, complianceView(journal), NL, '2026-01-15').find(
      (x) => x.ruleId === 'NL-DEP-CAP',
    )!
    expect(f.severity).toBe('violation')
    expect(f.remediation?.amountCents).toBe(50_000)
  })

  it('return window is 14 days from move-out', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'NL3',
      jurisdiction: 'NL',
      monthlyRentCents: 150_000,
      depositCents: 300_000,
      moveOutDate: '2026-03-01',
    })
    collectDeposit(journal, lease)

    // Day 10: clock ticking, not breached.
    let f = evaluateLease(lease, complianceView(journal), NL, '2026-03-11').find(
      (x) => x.ruleId === 'NL-DEP-RETURN',
    )!
    expect(f.severity).toBe('info')
    expect(f.meta!.deadline).toBe('2026-03-15')
    expect(f.meta!.daysRemaining).toBe(4)

    // Day 16: breached.
    f = evaluateLease(lease, complianceView(journal), NL, '2026-03-17').find(
      (x) => x.ruleId === 'NL-DEP-RETURN',
    )!
    expect(f.severity).toBe('violation')
  })
})
