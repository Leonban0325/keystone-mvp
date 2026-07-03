import { describe, expect, it } from 'vitest'
import { Journal } from '../src/engine/ledger/journal'
import { complianceView, evaluateLease } from '../src/engine/compliance/evaluator'
import { RULESETS } from '../src/engine/compliance/rulesets'
import { collectDeposit, makeLease } from './helpers'

const ES = RULESETS.get('ES')!

describe('ES statutory pack (LAU art. 36)', () => {
  it('one-month fianza with lodgement certificate is compliant', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'ES1',
      jurisdiction: 'ES',
      monthlyRentCents: 110_000,
      depositCents: 110_000,
      lodgementCertificate: 'INCASOL-2026-00412',
    })
    collectDeposit(journal, lease)
    const findings = evaluateLease(lease, complianceView(journal), ES, '2026-01-15')
    expect(findings.filter((f) => f.severity === 'violation')).toHaveLength(0)
  })

  it('missing lodgement certificate → warning citing art. 36', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'ES2',
      jurisdiction: 'ES',
      monthlyRentCents: 110_000,
      depositCents: 110_000,
      lodgementCertificate: null,
    })
    collectDeposit(journal, lease)
    const f = evaluateLease(lease, complianceView(journal), ES, '2026-01-15').find(
      (x) => x.ruleId === 'ES-FIANZA-LODGE',
    )!
    expect(f).toBeDefined()
    expect(f.severity).toBe('warning')
    expect(f.legalRef).toContain('art. 36')
  })

  it('fianza above one month → violation', () => {
    const journal = new Journal()
    const lease = makeLease({
      id: 'ES3',
      jurisdiction: 'ES',
      monthlyRentCents: 110_000,
      depositCents: 220_000,
      lodgementCertificate: 'INCASOL-2026-00999',
    })
    collectDeposit(journal, lease)
    const f = evaluateLease(lease, complianceView(journal), ES, '2026-01-15').find(
      (x) => x.ruleId === 'ES-FIANZA-CAP',
    )!
    expect(f.severity).toBe('violation')
    expect(f.remediation?.amountCents).toBe(110_000)
  })

  it('jurisdiction mismatch is rejected loudly', () => {
    const journal = new Journal()
    const lease = makeLease({ id: 'FRX', jurisdiction: 'FR' })
    expect(() => evaluateLease(lease, complianceView(journal), ES, '2026-01-15')).toThrow(
      /Ruleset ES applied to FR/,
    )
  })
})
