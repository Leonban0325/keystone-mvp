import { describe, expect, it } from 'vitest'
import { Journal } from '../src/engine/ledger/journal'
import { ACCOUNTS } from '../src/engine/ledger/types'
import { complianceView, evaluateLease } from '../src/engine/compliance/evaluator'
import { RULESETS } from '../src/engine/compliance/rulesets'
import { collectDeposit, makeLease } from './helpers'

const FR = RULESETS.get('FR')!

describe('FR statutory pack (Loi 89-462)', () => {
  it('unfurnished: deposit at exactly 1 month rent excl. charges is compliant', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR1',
      jurisdiction: 'FR',
      monthlyRentCents: 120_000,
      depositCents: 120_000,
    })
    collectDeposit(journal, lease)
    const findings = evaluateLease(lease, complianceView(journal), FR, '2026-01-15')
    expect(findings.filter((f) => f.severity === 'violation')).toHaveLength(0)
  })

  it('unfurnished: €200 over cap → violation with art. 22 ref and prepared refund', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR2',
      jurisdiction: 'FR',
      monthlyRentCents: 120_000,
      depositCents: 140_000, // €200 over the €1,200 cap
    })
    collectDeposit(journal, lease)
    const findings = evaluateLease(lease, complianceView(journal), FR, '2026-01-15')
    const cap = findings.find((f) => f.ruleId === 'FR-DEP-CAP')
    expect(cap).toBeDefined()
    expect(cap!.severity).toBe('violation')
    expect(cap!.legalRef).toContain('art. 22')
    expect(cap!.remediation?.amountCents).toBe(20_000)

    // One-click remediation: commit the prepared postings, violation closes.
    journal.append({
      id: journal.nextId(),
      date: '2026-01-15',
      kind: 'remediation_refund_excess',
      postings: cap!.remediation!.postings,
    })
    expect(journal.balance(ACCOUNTS.depositsHeld('FR2'))).toBe(120_000)
    const after = evaluateLease(lease, complianceView(journal), FR, '2026-01-15')
    expect(after.find((f) => f.ruleId === 'FR-DEP-CAP')).toBeUndefined()
  })

  it('furnished: cap is 2 months', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR3',
      jurisdiction: 'FR',
      furnished: true,
      monthlyRentCents: 100_000,
      depositCents: 200_000,
    })
    collectDeposit(journal, lease)
    const findings = evaluateLease(lease, complianceView(journal), FR, '2026-01-15')
    expect(findings.find((f) => f.ruleId === 'FR-DEP-CAP')).toBeUndefined()
  })

  it('return clock: conforming EDL → 1 month window, ticking but not breached', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR4',
      jurisdiction: 'FR',
      monthlyRentCents: 100_000,
      depositCents: 100_000,
      moveOutDate: '2026-02-01',
      edlConforming: true,
    })
    collectDeposit(journal, lease)
    const findings = evaluateLease(lease, complianceView(journal), FR, '2026-02-20')
    const clock = findings.find((f) => f.ruleId === 'FR-DEP-RETURN')
    expect(clock).toBeDefined()
    expect(clock!.severity).toBe('info')
    expect(clock!.meta!.deadline).toBe('2026-03-01')
    expect(clock!.meta!.daysRemaining).toBe(9)
    expect(clock!.meta!.penaltyCents).toBe(0)
  })

  it('return clock breached: 10% of monthly rent per commenced month', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR5',
      jurisdiction: 'FR',
      monthlyRentCents: 100_000,
      depositCents: 100_000,
      moveOutDate: '2026-02-01',
      edlConforming: true, // deadline 2026-03-01
    })
    collectDeposit(journal, lease)

    // 15 days late → 1 commenced month → €100 penalty
    let f = evaluateLease(lease, complianceView(journal), FR, '2026-03-16').find(
      (x) => x.ruleId === 'FR-DEP-RETURN',
    )!
    expect(f.severity).toBe('violation')
    expect(f.meta!.penaltyCents).toBe(10_000)

    // 1 month + 1 day late → 2 commenced months → €200 penalty
    f = evaluateLease(lease, complianceView(journal), FR, '2026-04-02').find(
      (x) => x.ruleId === 'FR-DEP-RETURN',
    )!
    expect(f.meta!.penaltyCents).toBe(20_000)
  })

  it('non-conforming EDL doubles the return window to 2 months', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR6',
      jurisdiction: 'FR',
      monthlyRentCents: 100_000,
      depositCents: 100_000,
      moveOutDate: '2026-02-01',
      edlConforming: false,
    })
    collectDeposit(journal, lease)
    const f = evaluateLease(lease, complianceView(journal), FR, '2026-03-16').find(
      (x) => x.ruleId === 'FR-DEP-RETURN',
    )!
    expect(f.severity).toBe('info')
    expect(f.meta!.deadline).toBe('2026-04-01')
  })

  it('no return finding once the deposit has been paid back', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'FR7',
      jurisdiction: 'FR',
      monthlyRentCents: 100_000,
      depositCents: 100_000,
      moveOutDate: '2026-02-01',
    })
    collectDeposit(journal, lease)
    journal.append({
      id: journal.nextId(),
      date: '2026-02-10',
      kind: 'deposit_returned',
      postings: [
        {
          account: ACCOUNTS.depositsHeld('FR7'),
          direction: 'debit',
          amountCents: 100_000,
          dims: { leaseId: 'FR7', jurisdiction: 'FR' },
        },
        {
          account: ACCOUNTS.segregatedDeposits,
          direction: 'credit',
          amountCents: 100_000,
          dims: { leaseId: 'FR7', jurisdiction: 'FR' },
        },
      ],
    })
    const findings = evaluateLease(lease, complianceView(journal), FR, '2026-06-01')
    expect(findings.find((f) => f.ruleId === 'FR-DEP-RETURN')).toBeUndefined()
  })
})
