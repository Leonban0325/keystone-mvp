import { Journal, posting } from '../../ledger/journal'
import { ACCOUNTS, JournalEvent, Jurisdiction } from '../../ledger/types'
import { addDays } from '../../compliance/dates'
import { intBetween, pick } from '../rng'
import { chargesCents, keyedRand, nonRoundAmountCents } from '../../simulators/realism'
import { Entity, Property, SeedLease, StoryAction } from '../types'

/** Shared portfolio generator for the persona catalog. Fixed-seed RNG in, deterministic out. */

export const FIRST_NAMES = ['Emma', 'Lucas', 'Chloé', 'Nathan', 'Léa', 'Jules', 'Manon', 'Louis', 'Camille', 'Hugo', 'Sanne', 'Daan', 'Fleur', 'Bram', 'Lotte', 'Sem', 'Carmen', 'Diego', 'Lucía', 'Javier', 'Marta', 'Pablo', 'Anna', 'Felix', 'Greta', 'Jonas', 'Clara', 'Maximilian']
export const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Leroy', 'Roux', 'Fournier', 'de Jong', 'Jansen', 'Visser', 'Bakker', 'Meijer', 'García', 'Fernández', 'López', 'Sánchez', 'Romero', 'Müller', 'Schmidt', 'Weber', 'Wagner', 'Becker']
/** Street pools per jurisdiction — a Leiden flat is not on "rue Voltaire" (D2). */
export const STREETS_BY: Record<string, string[]> = {
  FR: ['rue de la Paix', 'rue Voltaire', 'avenue Ledru-Rollin', 'rue de Charonne', 'boulevard Beaumarchais', 'rue Saint-Antoine', 'rue des Martyrs', 'rue Lepic', 'rue de Belleville', 'rue Ordener'],
  NL: ['Herengracht', 'Prinsengracht', 'Javastraat', 'Witte de Withstraat', 'Breestraat', 'Haarlemmerstraat', 'Rapenburg', 'Hooigracht'],
  ES: ['Carrer de Balmes', 'Carrer de Provença', 'Calle de Fuencarral', 'Calle de Serrano', 'Carrer de Sardenya', 'Calle de Atocha'],
  DE: ['Leopoldstraße', 'Schellingstraße', 'Kaulbachstraße', 'Amalienstraße', 'Türkenstraße', 'Nordendstraße'],
}
export const STREETS = STREETS_BY.FR

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
    // D2 §2.1: realistic, NON-round rents (€1,187 / €943.50), set at signing
    // and held flat until indexation.
    const rentCents = nonRoundAmountCents(opts.rand, opts.rentRangeCents[0], opts.rentRangeCents[1])
    const furnished = opts.rand() < opts.furnishedShare
    properties.push({
      id: pid,
      entityId: opts.entityId,
      label: `${intBetween(opts.rand, 2, 120)} ${pick(opts.rand, STREETS_BY[location.jurisdiction] ?? STREETS)}`,
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
      // Charges provision is a separate, smaller, non-round line (D2 §2.1).
      chargesCents: chargesCents(opts.rand),
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

/**
 * Natural tenant turnover across the curated year (Addendum G §3): a share
 * of leases end mid-year — deposit returned inside the statutory clock, a
 * void of 3–9 weeks, then a re-let at a slightly higher non-round rent.
 * Occupancy computed from these REAL move-in/out events rises and falls
 * within a realistic band instead of sitting flat. Keyed-PRNG deterministic.
 */
export function generateTurnover(cfg: {
  leases: SeedLease[]
  /** Lease ids that carry curated stories — never churned. */
  exclude?: Set<string>
  /** Annual share of leases that turn over (default 8%). */
  rate?: number
}): StoryAction[] {
  const actions: StoryAction[] = []
  for (const lease of cfg.leases) {
    if (lease.moveOutDate || cfg.exclude?.has(lease.id)) continue
    const rand = keyedRand(lease.id, 'turnover')
    if (rand() >= (cfg.rate ?? 0.08)) continue

    // Move-outs spread Aug–Apr (so the re-let completes inside the window),
    // weighted towards summer for student-adjacent stock.
    const monthOffset = rand() < 0.3 ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 7)
    const moveOut = addDays('2025-07-28', Math.floor(monthOffset * 30.4 + rand() * 12))
    const returned = addDays(moveOut, 4 + Math.floor(rand() * 6)) // inside every clock
    const relet = addDays(moveOut, 22 + Math.floor(rand() * 42)) // 3–9 week void

    const newRent = nonRoundAmountCents(
      rand,
      lease.monthlyRentCents,
      Math.round(lease.monthlyRentCents * 1.05),
    )
    actions.push(
      { date: moveOut, type: 'move_out', leaseId: lease.id },
      { date: returned, type: 'return_deposit', leaseId: lease.id },
      {
        date: relet,
        type: 'new_lease',
        lease: {
          id: `${lease.id}-t2`,
          propertyId: lease.propertyId,
          entityId: lease.entityId,
          jurisdiction: lease.jurisdiction,
          furnished: lease.furnished,
          monthlyRentCents: newRent,
          chargesCents: lease.chargesCents,
          depositCents: statutoryDepositCents(lease.jurisdiction, lease.furnished, newRent),
          startDate: relet,
          lodgementCertificate:
            lease.jurisdiction === 'ES' ? `FIANZA-${100_000 + (Math.floor(rand() * 890_000))}` : undefined,
          tenantNames: [tenantName(rand)],
        },
      },
    )
  }
  return actions
}
