import { Journal, posting } from '../../ledger/journal'
import { ACCOUNTS, Jurisdiction } from '../../ledger/types'
import { DFR_PATH } from '../../simulators/economics'
import { Entity, PersonaSeed, Property, SeedLease, StoryAction } from '../types'

/**
 * A1 · Meridian Properties SCI — the canonical demo persona (M. Laurent).
 * 10 units (6 FR / 2 NL / 2 ES), €125,000 under management:
 *   deposits held €22,202 (statutory €22,002 + the €200 over-cap story)
 *   reserves      €102,798
 * Revenue reconciles to the mid-landlord €249/unit figure as a trailing-12-
 * month ledger fold (Addendum D §2.4).
 *
 * Data realism (Addendum D2): rents are non-round and per-city realistic,
 * payment days vary per lease (1st/3rd/5th/10th), each tenant has a pinned
 * punctuality personality, and the year carries a vacancy gap (es-p1
 * re-let after a 72-day summer void) plus a slide-and-recover arrears arc
 * (fr-p5: missed October → partial catch-up → cleared in December).
 *
 * Seeded stories:
 *   fr-p3 deposit €1,784 vs €1,584 cap → the one red violation (one-click refund)
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
  chargesCents: number
  furnished: boolean
  depositCents: number
  tenants: string[]
  start: string
  paymentDay: number
  punctuality?: SeedLease['punctuality']
  moveOut?: string
  edlConforming?: boolean
  lodgement?: string | null
  coTenantSplit?: boolean
  indexation?: SeedLease['indexation']
  /** Lease is introduced during the replay by a story action, not at opening. */
  joinsMidYear?: boolean
}

const UNITS: UnitSpec[] = [
  { pid: 'fr-p1', label: 'Rue Oberkampf 14', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 164_500, chargesCents: 16_400, furnished: true, depositCents: 329_000, tenants: ['Élodie Marchand'], start: '2024-09-01', paymentDay: 1, punctuality: 'prompt' },
  // Indexation step mid-year (§6): rent moves 1,487.00 → 1,514.00 on 2025-09-01.
  { pid: 'fr-p2', label: 'Rue Saint-Maur 88', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 148_700, chargesCents: 13_850, furnished: true, depositCents: 297_400, tenants: ['Hugo Lefèvre'], start: '2025-02-01', paymentDay: 3 },
  // THE compliance demo moment: unfurnished cap = 1 month = €1,584, holding €1,784.
  { pid: 'fr-p3', label: 'Avenue Parmentier 27', city: 'Paris 11e', jurisdiction: 'FR', rentCents: 158_400, chargesCents: 15_200, furnished: false, depositCents: 178_400, tenants: ['Camille Robert'], start: '2025-11-01', paymentDay: 5, punctuality: 'prompt' },
  // The chronically-slightly-late tenant — always 3–8 days behind, every month.
  { pid: 'fr-p4', label: 'Rue de la République 5', city: 'Lyon 3e', jurisdiction: 'FR', rentCents: 113_200, chargesCents: 11_750, furnished: true, depositCents: 226_400, tenants: ['Inès Girard'], start: '2024-06-01', paymentDay: 1, punctuality: 'slow' },
  // Arrears ARC (D2 §4): fine for months → missed Oct → partial → caught up Dec.
  { pid: 'fr-p5', label: 'Quai Saint-Antoine 19', city: 'Lyon 2e', jurisdiction: 'FR', rentCents: 98_750, chargesCents: 9_800, furnished: true, depositCents: 197_500, tenants: ['Théo Bonnet'], start: '2025-04-01', paymentDay: 3, punctuality: 'prompt' },
  // Indexation story: revised 2025-08-01 on IRL 2025-Q2 = 146.79; window reopens August.
  { pid: 'fr-p6', label: 'Rue Garibaldi 112', city: 'Lyon 6e', jurisdiction: 'FR', rentCents: 89_400, chargesCents: 8_650, furnished: false, depositCents: 89_400, tenants: ['Margaux Perrin'], start: '2024-08-01', paymentDay: 10, indexation: { index: 'IRL', baseValue: 146.79, lastRevised: '2025-08-01' } },
  // Move-out story: 14-day NL return clock, T−10 at the 2026-07-01 epoch.
  { pid: 'nl-p1', label: 'Keizersgracht 210', city: 'Amsterdam', jurisdiction: 'NL', rentCents: 173_800, chargesCents: 17_450, furnished: true, depositCents: 347_600, tenants: ['Lotte de Vries'], start: '2024-05-01', paymentDay: 1, moveOut: '2026-06-27' },
  { pid: 'nl-p2', label: 'Van Woustraat 63', city: 'Amsterdam', jurisdiction: 'NL', rentCents: 156_200, chargesCents: 14_900, furnished: false, depositCents: 312_400, tenants: ['Daan Visser', 'Femke Bakker'], start: '2025-01-01', paymentDay: 5, coTenantSplit: true },
  // Vacancy gap (D2 §2.3): re-let 2025-10-01 after a 72-day summer void —
  // and the incoming fianza was never lodged with INCASOL (premium workflow).
  { pid: 'es-p1', label: 'Carrer de Mallorca 145', city: 'Barcelona', jurisdiction: 'ES', rentCents: 124_300, chargesCents: 12_350, furnished: true, depositCents: 124_300, tenants: ['Pau Serra'], start: '2025-10-01', paymentDay: 3, lodgement: null, joinsMidYear: true },
  // Arrears story: SDD R-fails from May → 2 months arrears, dunning mid-flight at epoch.
  { pid: 'es-p2', label: "Carrer del Comte d'Urgell 33", city: 'Barcelona', jurisdiction: 'ES', rentCents: 117_800, chargesCents: 11_400, furnished: false, depositCents: 117_800, tenants: ['Núria Vidal'], start: '2024-10-01', paymentDay: 1, punctuality: 'prompt', lodgement: 'INCASOL-2024-88712' },
]

/** The tenant who vacated es-p1 before the summer void (deposit back in-clock). */
const ES_P1_PREDECESSOR: SeedLease = {
  id: 'lease-es-p1-prior',
  propertyId: 'es-p1',
  entityId: ENTITY.id,
  jurisdiction: 'ES',
  furnished: true,
  monthlyRentCents: 119_800,
  chargesCents: 12_350,
  depositCents: 119_800,
  startDate: '2023-09-01',
  moveOutDate: '2025-07-20',
  paymentDay: 3,
  punctuality: 'prompt',
  lodgementCertificate: 'INCASOL-2023-51209',
  tenantNames: ['Jordi Camps'],
}

/** Balances €125,000 exactly: reserves make up the difference over deposits. */
const RESERVES_TOTAL_CENTS =
  12_500_000 - UNITS.reduce((sum, u) => sum + u.depositCents, 0)

export function buildA1Meridian(): PersonaSeed {
  const journal = new Journal()
  const properties: Property[] = []
  const leases: SeedLease[] = [ES_P1_PREDECESSOR]

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
  const midYearLeases: SeedLease[] = []

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
      chargesCents: u.chargesCents,
      depositCents: u.depositCents,
      startDate: u.start,
      moveOutDate: u.moveOut,
      edlConforming: u.edlConforming,
      lodgementCertificate: u.lodgement,
      tenantNames: u.tenants,
      paymentDay: u.paymentDay,
      punctuality: u.punctuality,
      coTenants: u.coTenantSplit
        ? u.tenants.map((name) => ({ name, shareCents: u.rentCents / u.tenants.length }))
        : undefined,
      indexation: u.indexation,
    }

    if (u.joinsMidYear) {
      // Deposit is collected by the new_lease story action on the move-in
      // date — opening events must all predate historyFrom.
      midYearLeases.push(lease)
    } else {
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
    }

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

  // Predecessor deposit (returned within the clock when the tenant left in July).
  journal.append({
    id: journal.nextId(),
    date: ES_P1_PREDECESSOR.startDate,
    kind: 'deposit_collected',
    memo: 'Deposit — Carrer de Mallorca 145 (previous tenancy)',
    postings: [
      posting(ACCOUNTS.segregatedDeposits, 'debit', ES_P1_PREDECESSOR.depositCents, { entityId: ENTITY.id, propertyId: 'es-p1', leaseId: ES_P1_PREDECESSOR.id, jurisdiction: 'ES', category: 'deposit' }),
      posting(ACCOUNTS.depositsHeld(ES_P1_PREDECESSOR.id), 'credit', ES_P1_PREDECESSOR.depositCents, { entityId: ENTITY.id, propertyId: 'es-p1', leaseId: ES_P1_PREDECESSOR.id, jurisdiction: 'ES', category: 'deposit' }),
    ],
  })

  const storyActions: StoryAction[] = [
    // Vacancy gap: predecessor out July 20, deposit back Aug 1 (in-clock),
    // re-let Oct 1 — no rent during the 72-day summer void (§2.3).
    { date: '2025-08-01', type: 'return_deposit', leaseId: ES_P1_PREDECESSOR.id },
    { date: '2025-10-01', type: 'new_lease', lease: midYearLeases[0] },
    // The curated compliance year (§2.2): findings raised AND remediated.
    { date: '2025-09-04', type: 'deposit_topup', leaseId: 'lease-fr-p1', amountCents: 20_000 },
    { date: '2025-09-06', type: 'refund_excess', leaseId: 'lease-fr-p1', amountCents: 20_000, raisedOn: '2025-09-04' },
    // Indexation applied mid-year: the rent series shows a real step (§6).
    { date: '2025-09-01', type: 'set_rent', leaseId: 'lease-fr-p2', rentCents: 151_400 },
    { date: '2025-11-10', type: 'deposit_topup', leaseId: 'lease-fr-p4', amountCents: 30_000 },
    { date: '2025-11-13', type: 'refund_excess', leaseId: 'lease-fr-p4', amountCents: 30_000, raisedOn: '2025-11-10' },
    { date: '2026-02-16', type: 'deposit_topup', leaseId: 'lease-fr-p5', amountCents: 25_000 },
    { date: '2026-02-18', type: 'refund_excess', leaseId: 'lease-fr-p5', amountCents: 25_000, raisedOn: '2026-02-16' },
    // Arrears ARC (D2 §4): fr-p5 missed October, paid half on Nov 20,
    // mandate fixed Dec 1 → December sweep collects the rest. Recovery, not
    // a flat "N months behind".
    { date: '2025-10-01', type: 'force_r', leaseId: 'lease-fr-p5' },
    { date: '2025-11-20', type: 'catch_up', leaseId: 'lease-fr-p5', amountCents: 100_000 },
    { date: '2025-12-01', type: 'clear_r', leaseId: 'lease-fr-p5' },
    // Savings executed in prior months — the NOI bridge shows accumulation.
    { date: '2026-03-20', type: 'execute_savings', opportunityId: 'insurance-requote', propertyId: 'fr-p1', feeCents: 3_625 },
    { date: '2026-04-14', type: 'execute_savings', opportunityId: 'utility-switch', propertyId: 'fr-p1', feeCents: 5_193 },
  ]

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
    storyActions,
    storyTags: {
      kyc: 'verified',
      defaultPersona: 'true',
    },
  }
}
