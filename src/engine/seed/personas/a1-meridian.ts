import { Journal, posting } from '../../ledger/journal'
import { ACCOUNTS, Jurisdiction } from '../../ledger/types'
import { DFR_PATH } from '../../simulators/economics'
import { Entity, PersonaSeed, Property, SeedLease } from '../types'

/**
 * A1 · Meridian Properties SCI — the canonical demo persona (M. Laurent).
 * 10 units (6 FR / 2 NL / 2 ES), €125,000 under management:
 *   deposits held €23,200 (statutory €23,000 + the €200 over-cap story)
 *   reserves      €101,800
 * Total is the number that must reconcile: at 2.25% DFR the dashboard shows
 * €171.94 revenue/unit/yr (SaaS €84 + NIM €75.94 + interchange €12) and
 * owner yield €168.75 — the deck's €172/€169. SaaS is billed at the Basic
 * rate (€7): that is the rate the deck's decomposition was computed with.
 *
 * Seeded stories:
 *   fr-p3 deposit €1,800 vs €1,600 cap → the one red violation (one-click refund)
 *   es-p1 fianza lodgement certificate missing → warning (premium workflow)
 *   nl-p1 move-out 2026-06-27 → 14-day return clock, T−10 at epoch
 *   es-p2 SDD R-fails from May → 2 months arrears, dunning mid-flight
 *   fr-p6 IRL indexation window opens next demo-month (August anniversary)
 */

const ENTITY: Entity = {
  id: 'ent-meridian',
  name: 'Meridian Properties SCI',
  kind: 'sci',
  country: 'FR',
}

interface UnitSpec {
  pid: string
  label: string
  city: string
  jurisdiction: Jurisdiction
  rentCents: number
  furnished: boolean
  depositCents: number
  tenants: string[]
  start: string
  moveOut?: string
  edlConforming?: boolean
  lodgement?: string | null
  coTenantSplit?: boolean
  indexation?: SeedLease['indexation']
}

const UNITS: UnitSpec[] = [
  { pid: 'fr-p1', label: 'Rue Oberkampf 14', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 160_000, furnished: true, depositCents: 320_000, tenants: ['Élodie Marchand'], start: '2024-09-01' },
  { pid: 'fr-p2', label: 'Rue Saint-Maur 88', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 150_000, furnished: true, depositCents: 300_000, tenants: ['Hugo Lefèvre'], start: '2025-02-01' },
  // THE compliance demo moment: unfurnished cap = 1 month = €1,600, holding €1,800.
  { pid: 'fr-p3', label: 'Avenue Parmentier 27', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 160_000, furnished: false, depositCents: 180_000, tenants: ['Camille Robert'], start: '2025-11-01' },
  { pid: 'fr-p4', label: 'Rue de la République 5', city: 'Lyon 3e', jurisdiction: 'FR', rentCents: 140_000, furnished: true, depositCents: 280_000, tenants: ['Inès Girard'], start: '2024-06-01' },
  { pid: 'fr-p5', label: 'Quai Saint-Antoine 19', city: 'Lyon 2e', jurisdiction: 'FR', rentCents: 130_000, furnished: true, depositCents: 260_000, tenants: ['Théo Bonnet'], start: '2025-04-01' },
  // Indexation story: revised 2025-08-01 on IRL 2025-Q2 = 146.79; window reopens August.
  { pid: 'fr-p6', label: 'Rue Garibaldi 112', city: 'Lyon 6e', jurisdiction: 'FR', rentCents: 100_000, furnished: false, depositCents: 100_000, tenants: ['Margaux Perrin'], start: '2024-08-01', indexation: { index: 'IRL', baseValue: 146.79, lastRevised: '2025-08-01' } },
  // Move-out story: 14-day NL return clock, T−10 at the 2026-07-01 epoch.
  { pid: 'nl-p1', label: 'Keizersgracht 210', city: 'Amsterdam', jurisdiction: 'NL', rentCents: 160_000, furnished: true, depositCents: 320_000, tenants: ['Lotte de Vries'], start: '2024-05-01', moveOut: '2026-06-27' },
  { pid: 'nl-p2', label: 'Van Woustraat 63', city: 'Amsterdam', jurisdiction: 'NL', rentCents: 155_000, furnished: false, depositCents: 310_000, tenants: ['Daan Visser', 'Femke Bakker'], start: '2025-01-01', coTenantSplit: true },
  // Premium workflow story: fianza never lodged with INCASOL.
  { pid: 'es-p1', label: 'Carrer de Mallorca 145', city: 'Barcelona', jurisdiction: 'ES', rentCents: 130_000, furnished: true, depositCents: 130_000, tenants: ['Pau Serra'], start: '2025-06-01', lodgement: null },
  // Arrears story: SDD R-fails from May → dunning mid-flight at epoch.
  { pid: 'es-p2', label: "Carrer del Comte d'Urgell 33", city: 'Barcelona', jurisdiction: 'ES', rentCents: 120_000, furnished: false, depositCents: 120_000, tenants: ['Núria Vidal'], start: '2024-10-01', lodgement: 'INCASOL-2024-88712' },
]

const RESERVES_TOTAL_CENTS = 10_180_000

export function buildA1Meridian(): PersonaSeed {
  const journal = new Journal()
  const properties: Property[] = []
  const leases: SeedLease[] = []

  journal.append({
    id: journal.nextId(),
    date: '2026-03-01',
    kind: 'capital_in',
    memo: 'Operating float',
    postings: [
      posting(ACCOUNTS.operating, 'debit', 1_000_000),
      posting('equity:capital', 'credit', 1_000_000),
    ],
  })

  const rentSum = UNITS.reduce((sum, u) => sum + u.rentCents, 0)
  let reservesLeft = RESERVES_TOTAL_CENTS

  UNITS.forEach((u, i) => {
    const property: Property = {
      id: u.pid,
      entityId: ENTITY.id,
      label: `${u.label}, ${u.city}`,
      city: u.city,
      jurisdiction: u.jurisdiction,
    }
    properties.push(property)

    const lease: SeedLease = {
      id: `lease-${u.pid}`,
      propertyId: u.pid,
      entityId: ENTITY.id,
      jurisdiction: u.jurisdiction,
      furnished: u.furnished,
      monthlyRentCents: u.rentCents,
      chargesCents: u.rentCents / 10,
      depositCents: u.depositCents,
      startDate: u.start,
      moveOutDate: u.moveOut,
      edlConforming: u.edlConforming,
      lodgementCertificate: u.lodgement,
      tenantNames: u.tenants,
      coTenants: u.coTenantSplit
        ? u.tenants.map((name) => ({ name, shareCents: u.rentCents / u.tenants.length }))
        : undefined,
      indexation: u.indexation,
    }
    leases.push(lease)

    const dims = {
      entityId: ENTITY.id,
      propertyId: u.pid,
      leaseId: lease.id,
      jurisdiction: u.jurisdiction,
      category: 'deposit',
    }
    journal.append({
      id: journal.nextId(),
      date: u.start,
      kind: 'deposit_collected',
      memo: `Deposit — ${property.label}`,
      postings: [
        posting(ACCOUNTS.segregatedDeposits, 'debit', u.depositCents, dims),
        posting(ACCOUNTS.depositsHeld(lease.id), 'credit', u.depositCents, dims),
      ],
    })

    const share =
      i === UNITS.length - 1
        ? reservesLeft
        : Math.round((RESERVES_TOTAL_CENTS * u.rentCents) / rentSum)
    reservesLeft -= share
    journal.append({
      id: journal.nextId(),
      date: '2026-03-15',
      kind: 'reserve_funding',
      memo: `Reserve top-up — ${property.label}`,
      postings: [
        posting(ACCOUNTS.segregatedReserves, 'debit', share, { entityId: ENTITY.id, propertyId: u.pid, category: 'reserve' }),
        posting(`liabilities:reserves_held:${ENTITY.id}`, 'credit', share, { entityId: ENTITY.id, propertyId: u.pid, category: 'reserve' }),
      ],
    })
  })

  return {
    id: 'a1-meridian',
    segment: 'A',
    role: 'owner',
    name: ENTITY.name,
    subtitle: 'M. Laurent · 10 units · Paris, Lyon, Amsterdam, Barcelona',
    // Mid-landlord segment (Addendum D): Pro tier, €249/unit/yr as a ledger fold.
    pricingTier: 'pro',
    epoch: '2026-07-01',
    historyFrom: '2025-07-01',
    entities: [ENTITY],
    properties,
    leases,
    events: [...journal.all],
    forceRFrom: { 'lease-es-p2': '2026-05-01' },
    cardMonthlySpendCents: 333_300,
    dfrPath: DFR_PATH,
    revenueTargetCents: 24_900,
    // The curated year (§2.2): findings raised AND remediated, an indexation
    // applied, savings executed in prior months. The tax appeal stays OPEN —
    // it is the live +€8,400 demo moment.
    storyActions: [
      { date: '2025-09-04', type: 'deposit_topup', leaseId: 'lease-fr-p1', amountCents: 20_000 },
      { date: '2025-09-06', type: 'refund_excess', leaseId: 'lease-fr-p1', amountCents: 20_000, raisedOn: '2025-09-04' },
      { date: '2025-09-01', type: 'set_rent', leaseId: 'lease-fr-p2', rentCents: 153_000 },
      { date: '2025-11-10', type: 'deposit_topup', leaseId: 'lease-fr-p4', amountCents: 30_000 },
      { date: '2025-11-13', type: 'refund_excess', leaseId: 'lease-fr-p4', amountCents: 30_000, raisedOn: '2025-11-10' },
      { date: '2026-02-16', type: 'deposit_topup', leaseId: 'lease-fr-p5', amountCents: 25_000 },
      { date: '2026-02-18', type: 'refund_excess', leaseId: 'lease-fr-p5', amountCents: 25_000, raisedOn: '2026-02-16' },
      { date: '2026-03-20', type: 'execute_savings', opportunityId: 'insurance-requote', propertyId: 'fr-p1', feeCents: 3_625 },
      { date: '2026-04-14', type: 'execute_savings', opportunityId: 'utility-switch', propertyId: 'fr-p1', feeCents: 5_193 },
    ],
    storyTags: {
      kyc: 'verified',
      defaultPersona: 'true',
    },
  }
}
