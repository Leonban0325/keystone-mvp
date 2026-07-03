/**
 * Ledger core types. Money is ALWAYS integer cents. Events are append-only
 * and every event must balance (Σ debits = Σ credits).
 */

export type Direction = 'debit' | 'credit'

export type Jurisdiction = 'FR' | 'NL' | 'ES' | 'DE' | 'AT' | 'IT'

export interface Dims {
  entityId?: string
  propertyId?: string
  leaseId?: string
  category?: string
  /** Required on postings that touch segregated deposit cash or deposit liabilities. */
  jurisdiction?: Jurisdiction
}

export interface Posting {
  /** Account path, e.g. `assets:cash:partner_bank:segregated_deposits`. */
  account: string
  direction: Direction
  /** Strictly positive integer cents. */
  amountCents: number
  dims: Dims
}

/** Two-phase movement marker: intent → (simulator settles) → settlement, or compensation on failure. */
export type MovementPhase = 'intent' | 'settlement' | 'compensation'

export interface JournalEvent {
  id: string
  /** ISO date (demo-clock time), e.g. `2026-03-01`. */
  date: string
  kind: string
  memo?: string
  postings: Posting[]
  phase?: MovementPhase
  /** For settlement/compensation events: id of the intent event they resolve. */
  ref?: string
  /** Serializable metadata (e.g. transfer destination on intent events). */
  meta?: Record<string, string>
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerError'
  }
}

/** Well-known account paths. */
export const ACCOUNTS = {
  segregatedDeposits: 'assets:cash:partner_bank:segregated_deposits',
  segregatedReserves: 'assets:cash:partner_bank:segregated_reserves',
  operating: 'assets:cash:partner_bank:operating',
  inFlight: (ref: string) => `assets:cash:in_flight:${ref}`,
  rentReceivable: (leaseId: string) => `assets:receivables:rent:${leaseId}`,
  depositsHeld: (leaseId: string) => `liabilities:deposits_held:${leaseId}`,
  tenantInterestAccrued: (leaseId: string) => `liabilities:tenant_interest_accrued:${leaseId}`,
  ownerPayable: (entityId: string) => `liabilities:owner_payable:${entityId}`,
  feeIncome: (stream: 'saas' | 'custody' | 'savings_share' | 'interchange') => `income:fees:${stream}`,
  nimShare: 'income:nim_share',
} as const

export const DEPOSITS_HELD_PREFIX = 'liabilities:deposits_held:'
export const SEGREGATED_PREFIX = 'assets:cash:partner_bank:segregated_'

/** Debit-normal roots: a debit increases the balance. Everything else is credit-normal. */
const DEBIT_NORMAL_ROOTS = ['assets', 'expenses']

export function isDebitNormal(account: string): boolean {
  return DEBIT_NORMAL_ROOTS.some((root) => account === root || account.startsWith(root + ':'))
}
