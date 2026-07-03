import { posting } from '../ledger/journal'
import { ACCOUNTS, Posting } from '../ledger/types'
import { monthlyYieldCents, splitYield } from './economics'
import type { WorldState } from '../world'

/**
 * Month-end yield accrual: balances × rates land as cash in, split into the
 * owners' share (per entity, pro-rata to the balances they own) and
 * Keystone's NIM share. The bank's share never touches our books.
 */
export function accrueMonthlyYield(s: WorldState, day: string): void {
  const { ownerRate, keystoneRate } = splitYield(s.dfr)
  const keystoneCents = monthlyYieldCents(totalBalances(s), keystoneRate)

  const ownerLegs: Posting[] = []
  let ownerTotal = 0
  for (const entity of s.persona.entities) {
    const cents = monthlyYieldCents(entityBalances(s, entity.id), ownerRate)
    if (cents <= 0) continue
    ownerTotal += cents
    ownerLegs.push(
      posting(ACCOUNTS.ownerPayable(entity.id), 'credit', cents, { entityId: entity.id, category: 'yield' }),
    )
  }
  const cashIn = ownerTotal + keystoneCents
  if (cashIn <= 0) return

  s.journal.append({
    id: s.journal.nextId(),
    date: day,
    kind: 'yield_accrual',
    memo: `Monthly yield at DFR ${(s.dfr * 100).toFixed(2)}%`,
    postings: [
      posting(ACCOUNTS.operating, 'debit', cashIn, { category: 'yield' }),
      ...ownerLegs,
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
