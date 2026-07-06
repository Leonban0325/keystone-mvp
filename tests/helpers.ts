import { Journal, posting } from '../src/engine/ledger/journal'
import { ACCOUNTS } from '../src/engine/ledger/types'
import { Lease } from '../src/engine/compliance/types'

export function makeLease(overrides: Partial<Lease> & Pick<Lease, 'id' | 'jurisdiction'>): Lease {
  return {
    propertyId: 'prop-1',
    entityId: 'ent-meridian',
    furnished: false,
    monthlyRentCents: 100_000,
    chargesCents: 10_000,
    depositCents: 100_000,
    startDate: '2025-01-01',
    tenantNames: ['A. Tenant'],
    ...overrides,
  }
}

/** Post the deposit-collection event for a lease (cash into segregation, liability up). */
export function collectDeposit(journal: Journal, lease: Lease, date = lease.startDate): void {
  const dims = {
    entityId: lease.entityId,
    propertyId: lease.propertyId,
    leaseId: lease.id,
    jurisdiction: lease.jurisdiction,
    category: 'deposit',
  }
  journal.append({
    id: journal.nextId(),
    date,
    kind: 'deposit_collected',
    postings: [
      posting(ACCOUNTS.segregatedDeposits, 'debit', lease.depositCents, dims),
      posting(ACCOUNTS.depositsHeld(lease.id), 'credit', lease.depositCents, dims),
    ],
  })
}
