import { posting } from '../ledger/journal'
import { ACCOUNTS, Posting } from '../ledger/types'
import { monthlyYieldCents, splitYield } from './economics'
import type { WorldState } from '../world'

/** Regimes where deposit interest belongs to the tenant (DE §551, AT §16b MRG). */
const TENANT_INTEREST_JURISDICTIONS = new Set(['DE', 'AT'])

/**
 * Month-end yield accrual: balances × rates land as cash in, split into the
 * owners' share (per entity, pro-rata to the balances they own) and
 * Keystone's NIM share. The bank's share never touches our books.
 * Deposits under tenant-interest regimes accrue to the tenant instead —
 * proof the tenant-yield regimes are engineered, not hand-waved.
 */
export function accrueMonthlyYield(s: WorldState, day: string): void {
  const { ownerRate, keystoneRate } = splitYield(s.dfr)

  // Tenant-interest deposits accrue to liabilities:tenant_interest_accrued.
  const tenantLegs: Posting[] = []
  let tenantTotal = 0
  let tenantDeposits = 0
  for (const lease of s.leases) {
    if (!TENANT_INTEREST_JURISDICTIONS.has(lease.jurisdiction)) continue
    const held = s.journal.balance(ACCOUNTS.depositsHeld(lease.id))
    if (held <= 0) continue
    tenantDeposits += held
    const cents = monthlyYieldCents(held, ownerRate)
    if (cents <= 0) continue
    tenantTotal += cents
    tenantLegs.push(
      posting(ACCOUNTS.tenantInterestAccrued(lease.id), 'credit', cents, {
        leaseId: lease.id,
        jurisdiction: lease.jurisdiction,
        category: 'tenant_interest',
      }),
    )
  }

  const ownerPool = totalBalances(s) - tenantDeposits
  const keystoneCents = monthlyYieldCents(ownerPool, keystoneRate)

  const ownerLegs: Posting[] = []
  let ownerTotal = 0
  for (const entity of s.persona.entities) {
    const balance = Math.max(0, entityBalances(s, entity.id) - entityTenantDeposits(s, entity.id))
    const cents = monthlyYieldCents(balance, ownerRate)
    if (cents <= 0) continue
    ownerTotal += cents
    ownerLegs.push(
      posting(ACCOUNTS.ownerPayable(entity.id), 'credit', cents, {
        entityId: entity.id,
        category: 'yield',
      }),
    )
  }

  const cashIn = ownerTotal + keystoneCents + tenantTotal
  if (cashIn <= 0) return

  s.journal.append({
    id: s.journal.nextId(),
    date: day,
    kind: 'yield_accrual',
    memo: `Monthly yield at DFR ${(s.dfr * 100).toFixed(2)}%`,
    postings: [
      posting(ACCOUNTS.operating, 'debit', cashIn, { category: 'yield' }),
      ...ownerLegs,
      ...tenantLegs,
      ...(keystoneCents > 0
        ? [posting(ACCOUNTS.nimShare, 'credit', keystoneCents, { category: 'yield' })]
        : []),
    ],
  })
}

export function totalBalances(s: WorldState): number {
  return (
    s.journal.balance(ACCOUNTS.segregatedDeposits) + s.journal.balance(ACCOUNTS.segregatedReserves)
  )
}

/** Deposits on an entity's leases + its reserve account. */
export function entityBalances(s: WorldState, entityId: string): number {
  let total = s.journal.balance(`liabilities:reserves_held:${entityId}`)
  for (const lease of s.leases) {
    if (lease.entityId === entityId) {
      total += s.journal.balance(ACCOUNTS.depositsHeld(lease.id))
    }
  }
  return total
}

function entityTenantDeposits(s: WorldState, entityId: string): number {
  let total = 0
  for (const lease of s.leases) {
    if (lease.entityId === entityId && TENANT_INTEREST_JURISDICTIONS.has(lease.jurisdiction)) {
      total += s.journal.balance(ACCOUNTS.depositsHeld(lease.id))
    }
  }
  return total
}
