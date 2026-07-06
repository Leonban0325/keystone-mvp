import { Journal, posting } from '../../ledger/journal'
import { ACCOUNTS, JournalEvent, Jurisdiction } from '../../ledger/types'
import { intBetween, pick } from '../rng'
import { Entity, Property, SeedLease } from '../types'

/** Shared portfolio generator for the persona catalog. Fixed-seed RNG in, deterministic out. */

export const FIRST_NAMES = ['Emma', 'Lucas', 'Chloé', 'Nathan', 'Léa', 'Jules', 'Manon', 'Louis', 'Camille', 'Hugo', 'Sanne', 'Daan', 'Fleur', 'Bram', 'Lotte', 'Sem', 'Carmen', 'Diego', 'Lucía', 'Javier', 'Marta', 'Pablo', 'Anna', 'Felix', 'Greta', 'Jonas', 'Clara', 'Maximilian']
export const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Leroy', 'Roux', 'Fournier', 'de Jong', 'Jansen', 'Visser', 'Bakker', 'Meijer', 'García', 'Fernández', 'López', 'Sánchez', 'Romero', 'Müller', 'Schmidt', 'Weber', 'Wagner', 'Becker']
export const STREETS = ['rue de la Paix', 'rue Voltaire', 'avenue Ledru-Rollin', 'rue de Charonne', 'boulevard Beaumarchais', 'rue Saint-Antoine', 'rue des Martyrs', 'rue Lepic', 'rue de Belleville', 'rue Ordener', 'Herengracht', 'Prinsengracht', 'Javastraat', 'Witte de Withstraat', 'Carrer de Balmes', 'Carrer de Provença', 'Calle de Fuencarral', 'Calle de Serrano', 'Leopoldstraße', 'Schellingstraße', 'Kaulbachstraße', 'Amalienstraße']

export function tenantName(rand: () => number): string {
  return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`
}

/** Statutory-compliant deposit for a jurisdiction (months of bare rent). */
export function statutoryDepositCents(
  jurisdiction: Jurisdiction,
  furnished: boolean,
  rentCents: number,
): number {
  switch (jurisdiction) {
    case 'FR':
      return (furnished ? 2 : 1) * rentCents
    case 'NL':
      return 2 * rentCents
    case 'ES':
      return rentCents
    case 'DE':
      return 3 * rentCents
    default:
      return rentCents
  }
}

export interface GenerateOpts {
  rand: () => number
  entityId: string
  count: number
  prefix: string
  cities: { city: string; jurisdiction: Jurisdiction }[]
  rentRangeCents: [number, number]
  furnishedShare: number
  startYears: [number, number]
  lodgementPrefix?: string
}

export function generateUnits(opts: GenerateOpts): { properties: Property[]; leases: SeedLease[] } {
  const properties: Property[] = []
  const leases: SeedLease[] = []
  for (let i = 0; i < opts.count; i += 1) {
    const location = pick(opts.rand, opts.cities)
    const pid = `${opts.prefix}-p${i + 1}`
    const rentCents = Math.round(intBetween(opts.rand, opts.rentRangeCents[0], opts.rentRangeCents[1]) / 500) * 500
    const furnished = opts.rand() < opts.furnishedShare
    properties.push({
      id: pid,
      entityId: opts.entityId,
      label: `${intBetween(opts.rand, 2, 120)} ${pick(opts.rand, STREETS)}`,
      city: location.city,
      jurisdiction: location.jurisdiction,
    })
    leases.push({
      id: `lease-${pid}`,
      propertyId: pid,
      entityId: opts.entityId,
      jurisdiction: location.jurisdiction,
      furnished,
      monthlyRentCents: rentCents,
      chargesCents: Math.round(rentCents / 10),
      depositCents: statutoryDepositCents(location.jurisdiction, furnished, rentCents),
      startDate: `${intBetween(opts.rand, opts.startYears[0], opts.startYears[1])}-${String(intBetween(opts.rand, 1, 12)).padStart(2, '0')}-01`,
      lodgementCertificate:
        location.jurisdiction === 'ES'
          ? `${opts.lodgementPrefix ?? 'FIANZA'}-${intBetween(opts.rand, 10_000, 99_999)}`
          : undefined,
      tenantNames: [tenantName(opts.rand)],
    })
  }
  return { properties, leases }
}

/** Opening journal: operating capital, one deposit event per lease, reserves per property. */
export function openingEvents(cfg: {
  leases: SeedLease[]
  properties: Property[]
  reservesPerUnitCents: number
  openingDate: string
  operatingCents?: number
}): JournalEvent[] {
  const journal = new Journal()
  journal.append({
    id: journal.nextId(),
    date: cfg.openingDate,
    kind: 'capital_in',
    memo: 'Operating float',
    postings: [
      posting(ACCOUNTS.operating, 'debit', cfg.operatingCents ?? 2_000_000),
      posting('equity:capital', 'credit', cfg.operatingCents ?? 2_000_000),
    ],
  })
  for (const lease of cfg.leases) {
    if (lease.depositCents <= 0) continue
    const dims = {
      entityId: lease.entityId,
      propertyId: lease.propertyId,
      leaseId: lease.id,
      jurisdiction: lease.jurisdiction,
      category: 'deposit',
    }
    journal.append({
      id: journal.nextId(),
      date: cfg.openingDate,
      kind: 'deposit_collected',
      memo: `Deposit — ${lease.id}`,
      postings: [
        posting(ACCOUNTS.segregatedDeposits, 'debit', lease.depositCents, dims),
        posting(ACCOUNTS.depositsHeld(lease.id), 'credit', lease.depositCents, dims),
      ],
    })
  }
  if (cfg.reservesPerUnitCents > 0) {
    for (const property of cfg.properties) {
      journal.append({
        id: journal.nextId(),
        date: cfg.openingDate,
        kind: 'reserve_funding',
        memo: `Reserve — ${property.label}`,
        postings: [
          posting(ACCOUNTS.segregatedReserves, 'debit', cfg.reservesPerUnitCents, {
            entityId: property.entityId,
            propertyId: property.id,
            category: 'reserve',
          }),
          posting(`liabilities:reserves_held:${property.entityId}`, 'credit', cfg.reservesPerUnitCents, {
            entityId: property.entityId,
            propertyId: property.id,
            category: 'reserve',
          }),
        ],
      })
    }
  }
  return [...journal.all]
}

export function entityOf(id: string, name: string, kind: Entity['kind'], country: string): Entity {
  return { id, name, kind, country }
}
