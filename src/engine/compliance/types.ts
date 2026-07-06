import { Jurisdiction, Posting } from '../ledger/types'

export interface Lease {
  id: string
  propertyId: string
  entityId: string
  jurisdiction: Jurisdiction
  furnished: boolean
  /** Monthly rent EXCLUDING charges, integer cents. */
  monthlyRentCents: number
  chargesCents: number
  /** Deposit as agreed in the contract, integer cents. */
  depositCents: number
  startDate: string
  /** Set when tenant has given notice / left; starts the return clock. */
  moveOutDate?: string
  /** FR: was the état des lieux de sortie conforming? Drives 1 vs 2 month return window. */
  edlConforming?: boolean
  /** ES: regional fianza lodgement certificate id, null/undefined when missing. */
  lodgementCertificate?: string | null
  /** DE: landlord demanded the Kaution as a lump sum (violates §551 Abs. 2). */
  lumpSumDemanded?: boolean
  tenantNames: string[]
}

export type Severity = 'info' | 'warning' | 'violation'

export type CheckKind =
  | 'deposit_cap'
  | 'lodgement_required'
  | 'return_deadline'
  | 'tenant_interest'
  | 'instalment_right'

export interface Rule {
  id: string
  check: CheckKind
  severity: Severity
  legal_ref: string
  message: string
  params: Record<string, unknown>
  remediation?: 'refund_excess'
}

export interface Ruleset {
  jurisdiction: Jurisdiction
  version: string
  source: string
  rules: Rule[]
}

/** A remediation is a prepared, balanced set of postings ready to commit. */
export interface PreparedRemediation {
  action: 'refund_excess'
  label: string
  amountCents: number
  postings: Posting[]
}

export interface Finding {
  ruleId: string
  leaseId: string
  severity: Severity
  legalRef: string
  message: string
  remediation?: PreparedRemediation
  /** Extra data for UI (deadlines, tickers). All cents/ISO dates. */
  meta?: Record<string, string | number | boolean>
}

/** The slice of ledger state the evaluator reads. */
export interface ComplianceLedgerView {
  /** Deposit currently held for a lease (liability balance), integer cents. */
  depositHeldCents(leaseId: string): number
  /** Tenant interest accrued on a lease's deposit, integer cents. */
  tenantInterestCents(leaseId: string): number
}
