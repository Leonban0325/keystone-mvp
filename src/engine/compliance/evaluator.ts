import { ACCOUNTS } from '../ledger/types'
import { Journal } from '../ledger/journal'
import { addDays, addMonths, commencedMonthsAfter, daysBetween } from './dates'
import {
  ComplianceLedgerView,
  Finding,
  Lease,
  PreparedRemediation,
  Rule,
  Ruleset,
} from './types'

/**
 * Deterministic evaluator: (lease, ledgerState, ruleset, today) → Finding[].
 * Pure function of its inputs; the demo clock supplies `today`.
 */
export function evaluateLease(
  lease: Lease,
  view: ComplianceLedgerView,
  ruleset: Ruleset,
  today: string,
): Finding[] {
  if (ruleset.jurisdiction !== lease.jurisdiction) {
    throw new Error(
      `Ruleset ${ruleset.jurisdiction} applied to ${lease.jurisdiction} lease ${lease.id}`,
    )
  }
  const findings: Finding[] = []
  for (const rule of ruleset.rules) {
    switch (rule.check) {
      case 'deposit_cap':
        pushIf(findings, checkDepositCap(lease, view, rule))
        break
      case 'lodgement_required':
        pushIf(findings, checkLodgement(lease, view, rule))
        break
      case 'return_deadline':
        pushIf(findings, checkReturnDeadline(lease, view, rule, today))
        break
      case 'tenant_interest':
        pushIf(findings, checkTenantInterest(lease, view, rule))
        break
      case 'instalment_right':
        pushIf(findings, checkInstalmentRight(lease, rule))
        break
    }
  }
  return findings
}

/** DE/AT/IT: interest belongs to the tenant — accrual must be running. */
function checkTenantInterest(lease: Lease, view: ComplianceLedgerView, rule: Rule): Finding | null {
  if (rule.params.required !== true) return null
  if (view.depositHeldCents(lease.id) <= 0) return null
  const accrued = view.tenantInterestCents(lease.id)
  if (accrued > 0) {
    return {
      ruleId: rule.id,
      leaseId: lease.id,
      severity: 'info',
      legalRef: rule.legal_ref,
      message: `Tenant interest accruing: €${(accrued / 100).toFixed(2)} credited to the tenant to date`,
      meta: { accruedCents: accrued },
    }
  }
  return {
    ruleId: rule.id,
    leaseId: lease.id,
    severity: rule.severity,
    legalRef: rule.legal_ref,
    message: rule.message,
    meta: { accruedCents: 0 },
  }
}

function checkInstalmentRight(lease: Lease, rule: Rule): Finding | null {
  if (!lease.lumpSumDemanded) return null
  return {
    ruleId: rule.id,
    leaseId: lease.id,
    severity: rule.severity,
    legalRef: rule.legal_ref,
    message: rule.message,
  }
}

export function evaluatePortfolio(
  leases: Lease[],
  view: ComplianceLedgerView,
  rulesets: Map<string, Ruleset>,
  today: string,
): Finding[] {
  return leases.flatMap((lease) => {
    const ruleset = rulesets.get(lease.jurisdiction)
    if (!ruleset) return []
    return evaluateLease(lease, view, ruleset, today)
  })
}

/** Adapter giving the evaluator its (read-only) window into the journal. */
export function complianceView(journal: Journal): ComplianceLedgerView {
  return {
    depositHeldCents: (leaseId) => journal.balance(ACCOUNTS.depositsHeld(leaseId)),
    tenantInterestCents: (leaseId) => journal.balance(ACCOUNTS.tenantInterestAccrued(leaseId)),
  }
}

function pushIf(findings: Finding[], finding: Finding | null) {
  if (finding) findings.push(finding)
}

function heldOrContractual(lease: Lease, view: ComplianceLedgerView): number {
  const held = view.depositHeldCents(lease.id)
  return held > 0 ? held : lease.depositCents
}

function checkDepositCap(lease: Lease, view: ComplianceLedgerView, rule: Rule): Finding | null {
  const months = lease.furnished
    ? (rule.params.furnishedMonths as number)
    : (rule.params.unfurnishedMonths as number)
  const capCents = months * lease.monthlyRentCents
  const deposit = heldOrContractual(lease, view)
  const excess = deposit - capCents
  if (excess <= 0) return null

  const remediation: PreparedRemediation = {
    action: 'refund_excess',
    label: `Refund €${(excess / 100).toFixed(2)} excess deposit to tenant`,
    amountCents: excess,
    postings: [
      {
        account: ACCOUNTS.depositsHeld(lease.id),
        direction: 'debit',
        amountCents: excess,
        dims: dimsOf(lease),
      },
      {
        account: ACCOUNTS.segregatedDeposits,
        direction: 'credit',
        amountCents: excess,
        dims: dimsOf(lease),
      },
    ],
  }
  return {
    ruleId: rule.id,
    leaseId: lease.id,
    severity: rule.severity,
    legalRef: rule.legal_ref,
    message: `${rule.message}: cap is ${months} month(s) of rent excl. charges (€${(capCents / 100).toFixed(2)}), holding €${(deposit / 100).toFixed(2)} — €${(excess / 100).toFixed(2)} over`,
    remediation,
    meta: { capCents, depositCents: deposit, excessCents: excess },
  }
}

function checkLodgement(lease: Lease, view: ComplianceLedgerView, rule: Rule): Finding | null {
  if (heldOrContractual(lease, view) <= 0) return null
  if (lease.lodgementCertificate) return null
  return {
    ruleId: rule.id,
    leaseId: lease.id,
    severity: rule.severity,
    legalRef: rule.legal_ref,
    message: rule.message,
    meta: { certificateMissing: true },
  }
}

function checkReturnDeadline(
  lease: Lease,
  view: ComplianceLedgerView,
  rule: Rule,
  today: string,
): Finding | null {
  if (!lease.moveOutDate) return null
  const stillHeld = view.depositHeldCents(lease.id)
  if (stillHeld <= 0) return null

  const deadline =
    typeof rule.params.days === 'number'
      ? addDays(lease.moveOutDate, rule.params.days)
      : addMonths(
          lease.moveOutDate,
          lease.edlConforming === false
            ? (rule.params.monthsNonConforming as number)
            : (rule.params.monthsConforming as number),
        )

  const daysRemaining = daysBetween(today, deadline)
  const breached = today > deadline

  let penaltyCents = 0
  const penalty = rule.params.penalty as
    | { type: string; percent: number }
    | undefined
  if (breached && penalty?.type === 'percent_of_monthly_rent_per_commenced_month') {
    const monthsLate = commencedMonthsAfter(deadline, today)
    penaltyCents = Math.round((lease.monthlyRentCents * penalty.percent) / 100) * monthsLate
  }

  return {
    ruleId: rule.id,
    leaseId: lease.id,
    severity: breached ? rule.severity : 'info',
    legalRef: rule.legal_ref,
    message: breached
      ? `${rule.message}: deadline ${deadline} passed${penaltyCents ? `, penalty exposure €${(penaltyCents / 100).toFixed(2)}` : ''}`
      : `${rule.message}: €${(stillHeld / 100).toFixed(2)} due back by ${deadline} (${daysRemaining} day(s) left)`,
    meta: {
      deadline,
      daysRemaining,
      breached,
      heldCents: stillHeld,
      penaltyCents,
    },
  }
}

function dimsOf(lease: Lease) {
  return {
    entityId: lease.entityId,
    propertyId: lease.propertyId,
    leaseId: lease.id,
    jurisdiction: lease.jurisdiction,
    category: 'deposit',
  }
}
