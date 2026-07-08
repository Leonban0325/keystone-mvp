import { mulberry32, intBetween, pick } from '../rng'
import { PARTNER_BANK } from '../../../config'
import { DFR_PATH } from '../../simulators/economics'
import { Entity, PersonaSeed, Property, SeedLease, StoryAction } from '../types'
import { entityOf, generateTurnover, generateUnits, openingEvents, statutoryDepositCents, tenantName, STREETS } from './portfolio'

/**
 * Persona catalog — Addendum A (docs/CLIENT-PERSONAS.md).
 * Every builder is deterministic (fixed RNG seed per persona).
 * A1 (Meridian) lives in a1-meridian.ts; segment revenue targets are Addendum D §2.4.
 */

const EPOCH = '2026-07-01'
const YEAR_BACK = '2025-07-01'

// ── A2 · Sofia Jansen — the solo starter ────────────────────────────────────

export function buildA2Sofia(): PersonaSeed {
  const entity: Entity = entityOf('ent-sofia', 'Sofia Jansen', 'individual', 'NL')
  const mk = (
    pid: string,
    label: string,
    rentCents: number,
    chargesCents: number,
    depositCents: number,
    tenants: string[],
    paymentDay: number,
    coTenantSplit?: boolean,
  ): { property: Property; lease: SeedLease } => ({
    property: { id: pid, entityId: entity.id, label, city: 'Rotterdam', jurisdiction: 'NL' },
    lease: {
      id: `lease-${pid}`,
      propertyId: pid,
      entityId: entity.id,
      jurisdiction: 'NL',
      furnished: false,
      monthlyRentCents: rentCents,
      chargesCents,
      depositCents,
      startDate: '2025-03-01',
      tenantNames: tenants,
      paymentDay,
      coTenants: coTenantSplit
        ? tenants.map((name) => ({ name, shareCents: rentCents / tenants.length }))
        : undefined,
    },
  })

  // D2 §2.1: non-round rents, separate charges lines, varied payment days.
  const units = [
    mk('sj-p1', 'Witte de Withstraat 71b', 114_300, 10_450, 228_600, ['Timo Smit'], 1),
    mk('sj-p2', 'Nieuwe Binnenweg 154a', 104_650, 9_800, 209_300, ['Yara Kuipers'], 5),
    mk('sj-p3', 'Bergweg 23', 163_500, 15_600, 218_000, ['Daan Visser', 'Femke Bakker', 'Ruben Mol'], 3, true),
  ]

  return {
    id: 'a2-sofia',
    segment: 'A',
    role: 'owner',
    name: 'Sofia Jansen',
    subtitle: 'Solo starter · 3 units · Rotterdam · flat-share native',
    pricingTier: 'basic',
    epoch: EPOCH,
    historyFrom: YEAR_BACK,
    dfrPath: DFR_PATH,
    revenueTargetCents: 17_700,
    storyActions: [
      // The late co-tenant story starts two months before the epoch.
      { date: '2026-05-01', type: 'set_pays_late', leaseId: 'lease-sj-p3', coTenantIndex: 2 },
    ],
    entities: [entity],
    properties: units.map((u) => u.property),
    leases: units.map((u) => u.lease),
    events: openingEvents({
      leases: units.map((u) => u.lease),
      properties: units.map((u) => u.property),
      reservesPerUnitCents: 500_000, // €15,000 reserves; deposits €6,500 → €21,500 total
      openingDate: '2025-06-15',
      operatingCents: 500_000,
    }),
    cardMonthlySpendCents: 42_000,
    storyTags: { kyc: 'verified', showNetCostCard: 'true' },
  }
}

// ── A3 · Falkenrath Grundbesitz GbR — the DE expansion teaser (read-only) ───

export function buildA3Falkenrath(): PersonaSeed {
  const rand = mulberry32(0xa3)
  const entity = entityOf('ent-falkenrath', 'Falkenrath Grundbesitz GbR', 'gbr', 'DE')
  const { properties, leases } = generateUnits({
    rand,
    entityId: entity.id,
    count: 22,
    prefix: 'fk',
    cities: [{ city: 'München', jurisdiction: 'DE' }],
    rentRangeCents: [80_000, 140_000],
    furnishedShare: 0.2,
    startYears: [2022, 2025],
  })
  // Story: one lease where a lump-sum Kaution was demanded (§551 Abs. 2 violation).
  leases[4].lumpSumDemanded = true
  // Natural turnover (G §3): occupancy moves with real lease events.
  const storyActions = generateTurnover({ leases, exclude: new Set([leases[4].id]) })

  return {
    id: 'a3-falkenrath',
    segment: 'A',
    role: 'owner',
    name: 'Falkenrath Grundbesitz GbR',
    subtitle: '22 units · München · coming market preview — §551 BGB already speaks',
    pricingTier: 'basic',
    epoch: EPOCH,
    historyFrom: YEAR_BACK,
    dfrPath: DFR_PATH,
    storyActions,
    entities: [entity],
    properties,
    leases,
    events: openingEvents({
      leases,
      properties,
      reservesPerUnitCents: 0,
      openingDate: '2025-06-15',
    }),
    cardMonthlySpendCents: 0,
    watermark: 'Germany — expansion tranche · rails pending, engine live',
    storyTags: { kyc: 'verified' },
  }
}

// ── B1 · Gestion Haussmann SARL — administrateur de biens (must-work) ───────

export function buildB1Haussmann(): PersonaSeed {
  const rand = mulberry32(0xb1)
  const manager = entityOf('ent-haussmann', 'Gestion Haussmann SARL', 'sarl', 'FR')
  const entities: Entity[] = [manager]
  const properties: Property[] = []
  const leases: SeedLease[] = []

  const cities = [
    { city: 'Paris 8e', jurisdiction: 'FR' as const },
    { city: 'Paris 9e', jurisdiction: 'FR' as const },
    { city: 'Paris 17e', jurisdiction: 'FR' as const },
    { city: 'Levallois-Perret', jurisdiction: 'FR' as const },
    { city: 'Boulogne-Billancourt', jurisdiction: 'FR' as const },
  ]

  // 42 owner clients summing to exactly 850 units.
  const counts: number[] = []
  let remaining = 850
  for (let i = 0; i < 42; i += 1) {
    const left = 42 - i - 1
    const max = Math.min(34, remaining - left * 8)
    const n = i === 41 ? remaining : intBetween(rand, 8, Math.max(8, max))
    counts.push(n)
    remaining -= n
  }

  counts.forEach((count, i) => {
    const isSci = rand() < 0.5
    const name = isSci
      ? `SCI ${pick(rand, STREETS).replace(/^(rue|avenue|boulevard) (de la |de |des |du )?/i, '')}`
      : `M. ${tenantName(rand).split(' ')[1]}`
    const owner = entityOf(`ent-hb-${i + 1}`, `${name} (${i + 1})`, isSci ? 'sci' : 'individual', 'FR')
    entities.push(owner)
    const units = generateUnits({
      rand,
      entityId: owner.id,
      count,
      prefix: `hb${i + 1}`,
      cities,
      rentRangeCents: [70_000, 150_000],
      furnishedShare: 0.4,
      startYears: [2021, 2025],
    })
    properties.push(...units.properties)
    leases.push(...units.leases)
  })

  // Stories: 3 of 42 owners with open findings (roll-up shows red dots).
  leases[3].depositCents += 20_000 // owner 1: FR over-cap by €200
  leases[counts[0] + 2].depositCents += 35_000 // owner 2: over-cap by €350
  const late = leases[counts[0] + counts[1] + 1] // owner 3: return clock breached, penalty ticking
  late.moveOutDate = '2026-05-05'
  late.edlConforming = true

  // Arrears aging strip: R-failing collections staggered across the buckets
  // (April fails → 61–90d, May → 31–60d, June → 0–30d at the July epoch).
  const forceRFrom: Record<string, string> = {
    [leases[10].id]: '2026-04-01',
    [leases[60].id]: '2026-04-01',
    [leases[120].id]: '2026-05-01',
    [leases[200].id]: '2026-05-01',
    [leases[300].id]: '2026-06-01',
    [leases[420].id]: '2026-06-01',
  }

  // The curated year (§2.2): 14 findings raised AND remediated ("14 resolved,
  // avg ~2.3 days"), savings executed in prior months, one vacancy + re-let
  // with the deposit returned inside its clock.
  const storyActions: StoryAction[] = []
  const cycleLeases = [15, 45, 75, 110, 150, 190, 230, 270, 310, 350, 390, 430, 470, 510]
  cycleLeases.forEach((index, i) => {
    const month = 8 + (i % 11) // spread across 2025-08 .. 2026-06, some months twice
    const y = month <= 12 ? 2025 : 2026
    const m = String(((month - 1) % 12) + 1).padStart(2, '0')
    const day = String(6 + (i % 3) * 7).padStart(2, '0')
    const raised = `${y}-${m}-${day}`
    const resolved = `${y}-${m}-${String(Number(day) + 2 + (i % 2)).padStart(2, '0')}`
    if (resolved >= EPOCH) return
    const amount = (15 + (i % 5) * 6) * 1000
    storyActions.push(
      { date: raised, type: 'deposit_topup', leaseId: leases[index].id, amountCents: amount },
      { date: resolved, type: 'refund_excess', leaseId: leases[index].id, amountCents: amount, raisedOn: raised },
    )
  })
  // Arrears ARC (D2 §4): a slide — paid fine, missed January, one partial
  // payment in March, still failing at the epoch → escalated in the aging.
  storyActions.push(
    { date: '2026-01-01', type: 'force_r', leaseId: leases[500].id },
    { date: '2026-03-15', type: 'catch_up', leaseId: leases[500].id, amountCents: 60_000 },
  )

  // Vacancy: unit vacated Dec 31, deposit back Jan 8 (inside the clock), re-let in March.
  const vacated = leases[70]
  storyActions.push(
    { date: '2025-12-31', type: 'move_out', leaseId: vacated.id },
    { date: '2026-01-08', type: 'return_deposit', leaseId: vacated.id },
    {
      date: '2026-03-01',
      type: 'new_lease',
      lease: {
        id: `${vacated.propertyId}-relet`,
        propertyId: vacated.propertyId,
        entityId: vacated.entityId,
        jurisdiction: vacated.jurisdiction,
        furnished: vacated.furnished,
        monthlyRentCents: vacated.monthlyRentCents + 3_000,
        chargesCents: vacated.chargesCents,
        depositCents: statutoryDepositCents(vacated.jurisdiction, vacated.furnished, vacated.monthlyRentCents + 3_000),
        startDate: '2026-03-01',
        tenantNames: ['Louise Charpentier'],
      },
    },
    // Savings executed in prior months → the NOI bridge shows accumulation.
    { date: '2026-03-12', type: 'execute_savings', opportunityId: 'insurance-b1-haussmann', propertyId: properties[0].id, feeCents: 32_625 },
    { date: '2026-04-10', type: 'execute_savings', opportunityId: 'utility-b1-haussmann', propertyId: properties[0].id, feeCents: 73_500 },
  )
  // Natural turnover across the year (G §3) — storied leases excluded.
  const storied = new Set<string>([
    leases[3].id,
    leases[counts[0] + 2].id,
    late.id,
    vacated.id,
    leases[500].id,
    ...Object.keys(forceRFrom),
    ...cycleLeases.map((i) => leases[i].id),
  ])
  storyActions.push(...generateTurnover({ leases, exclude: storied, rate: 0.07 }))

  return {
    id: 'b1-haussmann',
    segment: 'B',
    role: 'property_manager',
    name: 'Gestion Haussmann SARL',
    subtitle: '850 units · 42 owner clients · 11 staff · Paris',
    pricingTier: 'enterprise',
    epoch: EPOCH,
    historyFrom: YEAR_BACK,
    dfrPath: DFR_PATH,
    revenueTargetCents: 20_300,
    storyActions,
    entities,
    properties,
    leases,
    events: openingEvents({
      leases,
      properties,
      reservesPerUnitCents: 200_000,
      openingDate: '2025-06-20',
      operatingCents: 10_000_000,
    }),
    cardMonthlySpendCents: 1_800_000,
    managerFeePct: 0.07,
    managerEntityId: manager.id,
    forceRFrom,
    storyTags: { kyc: 'verified', teamSeats: '11' },
  }
}

// ── B2 · Stichting Wonen Rijnland — housing association (white-label) ───────

export function buildB2Rijnland(): PersonaSeed {
  const rand = mulberry32(0xb2)
  const entity = entityOf('ent-rijnland', 'Stichting Wonen Rijnland', 'stichting', 'NL')
  const { properties, leases } = generateUnits({
    rand,
    entityId: entity.id,
    count: 400,
    prefix: 'wr',
    cities: [
      { city: 'Leiden', jurisdiction: 'NL' },
      { city: 'Leiderdorp', jurisdiction: 'NL' },
      { city: 'Oegstgeest', jurisdiction: 'NL' },
    ],
    rentRangeCents: [55_000, 85_000],
    furnishedShare: 0,
    startYears: [2018, 2025],
  })
  // Social housing: one month deposit, not two.
  for (const lease of leases) lease.depositCents = lease.monthlyRentCents
  // Benefit flows dominant (D2 §4/§7): huurtoeslag pays ~40% of rent for
  // 60% of tenancies — the state portion always settles on time, the tenant
  // portion carries its own timing personality.
  leases.forEach((lease, i) => {
    if (i % 5 < 3) {
      lease.benefitCents = Math.round((lease.monthlyRentCents * 0.4) / 100) * 100 + 37
    }
  })

  // Turnover over the year: move-outs with deposits returned inside the clock,
  // plus social-mode arrears arcs — longer, with a payment plan (D2 §4).
  const storyActions: StoryAction[] = [
    { date: '2025-10-31', type: 'move_out', leaseId: leases[10].id },
    { date: '2025-11-08', type: 'return_deposit', leaseId: leases[10].id },
    { date: '2026-01-31', type: 'move_out', leaseId: leases[50].id },
    { date: '2026-02-06', type: 'return_deposit', leaseId: leases[50].id },
    { date: '2026-04-30', type: 'move_out', leaseId: leases[90].id },
    { date: '2026-05-09', type: 'return_deposit', leaseId: leases[90].id },
    { date: '2026-06-01', type: 'force_r', leaseId: leases[130].id },
    // Payment plan: fell behind in February, pays €280/month back from March,
    // still in arrears at the epoch — the long social arc, not a write-off.
    { date: '2026-02-01', type: 'force_r', leaseId: leases[200].id },
    { date: '2026-03-20', type: 'catch_up', leaseId: leases[200].id, amountCents: 28_000 },
    { date: '2026-04-20', type: 'catch_up', leaseId: leases[200].id, amountCents: 28_000 },
    { date: '2026-05-20', type: 'catch_up', leaseId: leases[200].id, amountCents: 28_000 },
    { date: '2026-06-20', type: 'catch_up', leaseId: leases[200].id, amountCents: 28_000 },
  ]
  // Social stock still turns over (G §3) — storied leases excluded.
  storyActions.push(
    ...generateTurnover({
      leases,
      exclude: new Set([leases[10].id, leases[50].id, leases[90].id, leases[130].id, leases[200].id]),
      rate: 0.06,
    }),
  )

  return {
    id: 'b2-rijnland',
    segment: 'B',
    role: 'institution',
    name: 'Stichting Wonen Rijnland',
    subtitle: 'Woningcorporatie · 400 units under management · Leiden',
    pricingTier: 'enterprise',
    epoch: EPOCH,
    historyFrom: YEAR_BACK,
    dfrPath: DFR_PATH,
    revenueTargetCents: 12_400,
    timingProfile: 'social',
    storyActions,
    entities: [entity],
    properties,
    leases,
    events: openingEvents({
      leases,
      properties,
      reservesPerUnitCents: 300_000, // €3,000/unit — the low-float honesty story
      openingDate: '2025-06-20',
      operatingCents: 5_000_000,
    }),
    cardMonthlySpendCents: 900_000,
    themeOverride: { brand: '#1F6F43', name: 'Wonen Rijnland' },
    procurement: ['EU data residency', 'SSO (SAML) ready', 'Audit export', 'Huurtoeslag pre-reconciled', 'Social arrears mode'],
    storyTags: { kyc: 'verified' },
  }
}

// ── B3 · Ibervia Living SOCIMI — institutional BTR, the refi-wall story ─────

export function buildB3Ibervia(): PersonaSeed {
  const rand = mulberry32(0xb3)
  const entity = entityOf('ent-ibervia', 'Ibervia Living SOCIMI', 'socimi', 'ES')
  const { properties, leases } = generateUnits({
    rand,
    entityId: entity.id,
    count: 180,
    prefix: 'ib',
    cities: [{ city: 'Madrid — Torre Ibervia', jurisdiction: 'ES' }],
    rentRangeCents: [100_000, 150_000],
    furnishedShare: 0.6,
    startYears: [2023, 2025],
    lodgementPrefix: 'IVIMA-2024',
  })
  // Story: 2 of 180 fianza lodgement certificates missing.
  leases[17].lodgementCertificate = null
  leases[121].lodgementCertificate = null
  // 6 vacant units → occupancy 174/180.
  const vacated = leases.slice(0, 6)
  for (const lease of vacated) lease.moveOutDate = '2026-04-01'
  for (const lease of vacated) lease.depositCents = 0

  const noiAnnual = leases.reduce((s, l) => s + l.monthlyRentCents, 0) * 12 * 0.8

  // BTR churn (G §3): professionally managed, but tenants still move.
  const b3Turnover = generateTurnover({
    leases,
    exclude: new Set([...vacated.map((l) => l.id), leases[17].id, leases[121].id]),
    rate: 0.09,
  })

  return {
    id: 'b3-ibervia',
    segment: 'B',
    role: 'institution',
    name: 'Ibervia Living SOCIMI',
    subtitle: 'Listed BTR · Torre Ibervia · 180 units · Madrid',
    pricingTier: 'enterprise',
    epoch: EPOCH,
    historyFrom: YEAR_BACK,
    dfrPath: DFR_PATH,
    revenueTargetCents: 26_400,
    // Professionally managed BTR: tighter payment timing (D2 §7).
    timingProfile: 'tight',
    storyActions: [
      { date: '2026-02-20', type: 'execute_savings', opportunityId: 'insurance-b3-ibervia', propertyId: 'ib-p1', feeCents: 40_000 },
      ...b3Turnover,
    ],
    entities: [entity],
    properties,
    leases,
    events: openingEvents({
      leases,
      properties,
      reservesPerUnitCents: 150_000,
      openingDate: '2025-06-20',
      operatingCents: 8_000_000,
    }),
    cardMonthlySpendCents: 700_000,
    lenderPack: {
      assetLabel: 'Torre Ibervia, Madrid — 180 BTR units',
      loanCents: 2_100_000_000, // €21M
      valueCents: 3_240_000_000, // €32.4M → LTV 64.8% vs 65% covenant: amber
      debtServiceAnnualCents: Math.round(noiAnnual / 1.55), // DSCR ≈ 1.55 vs 1.20: green
      covenants: { dscrMin: 1.2, ltvMax: 0.65 },
      occupancy: { occupied: 174, total: 180 },
      epc: { A: 96, B: 64, C: 20 },
    },
    procurement: ['Covenant monitoring', 'Lender pack on demand', 'Fianza at scale (178/180 lodged)'],
    storyTags: { kyc: 'verified' },
  }
}

// ── C1 · Rentora Software — PMS integration partner (must-work) ─────────────

export function buildC1Rentora(): PersonaSeed {
  return {
    id: 'c1-rentora',
    segment: 'C',
    role: 'partner',
    name: 'Rentora Software',
    subtitle: 'PMS partner · 60,000 units on platform · Keystone embedded as the financial layer',
    pricingTier: 'enterprise',
    epoch: EPOCH,
    historyFrom: EPOCH,
    entities: [],
    properties: [],
    leases: [],
    events: [],
    cardMonthlySpendCents: 0,
    partner: {
      apiKeys: [
        { label: 'Production', key: 'ks_live_7f3e…d91a', created: '2026-02-11' },
        { label: 'Sandbox', key: 'ks_test_a2c8…44b0', created: '2026-01-28' },
      ],
      funnel: {
        eligible: 60_000,
        activated: 4_200,
        curve: [
          { month: 'Aug', activated: 120 },
          { month: 'Sep', activated: 340 },
          { month: 'Oct', activated: 610 },
          { month: 'Nov', activated: 980 },
          { month: 'Dec', activated: 1_450 },
          { month: 'Jan', activated: 1_960 },
          { month: 'Feb', activated: 2_430 },
          { month: 'Mar', activated: 2_980 },
          { month: 'Apr', activated: 3_420 },
          { month: 'May', activated: 3_800 },
          { month: 'Jun', activated: 4_050 },
          { month: 'Jul', activated: 4_200 },
        ],
      },
      revShare: { partnerSharePct: 0.2, perUnitAnnualCents: 17_194, activatedUnits: 4_200 },
      webhookSeed: [
        { event: 'lease.compliance_finding.opened', endpoint: 'https://api.rentora.io/keystone/hooks' },
        { event: 'deposit.collected', endpoint: 'https://api.rentora.io/keystone/hooks' },
        { event: 'sdd.collection.settled', endpoint: 'https://api.rentora.io/keystone/hooks' },
        { event: 'sdd.collection.r_transaction', endpoint: 'https://api.rentora.io/keystone/hooks' },
        { event: 'deposit.return_clock.breached', endpoint: 'https://api.rentora.io/keystone/hooks' },
        { event: 'payout.owner_distribution.sent', endpoint: 'https://api.rentora.io/keystone/hooks' },
      ],
    },
    storyTags: {},
  }
}

// ── C2 · Agence Réseau Hexagone — letting-agent franchise network ───────────

export function buildC2Hexagone(): PersonaSeed {
  return {
    id: 'c2-hexagone',
    segment: 'C',
    role: 'partner',
    name: 'Agence Réseau Hexagone',
    subtitle: '120-branch franchise · 15,000 managed units · co-branded rollout',
    pricingTier: 'network',
    epoch: EPOCH,
    historyFrom: EPOCH,
    entities: [],
    properties: [],
    leases: [],
    events: [],
    cardMonthlySpendCents: 0,
    partner: {
      funnel: {
        eligible: 15_000,
        activated: 4_130,
        curve: [
          { month: 'Jan', activated: 260 },
          { month: 'Feb', activated: 720 },
          { month: 'Mar', activated: 1_340 },
          { month: 'Apr', activated: 2_150 },
          { month: 'May', activated: 3_020 },
          { month: 'Jun', activated: 3_760 },
          { month: 'Jul', activated: 4_130 },
        ],
      },
      branches: [
        { name: 'Paris Bastille', x: 52, y: 22, live: true, units: 410 },
        { name: 'Paris Batignolles', x: 50, y: 20, live: true, units: 385 },
        { name: 'Lille', x: 50, y: 8, live: true, units: 240 },
        { name: 'Rouen', x: 42, y: 16, live: true, units: 175 },
        { name: 'Rennes', x: 26, y: 26, live: true, units: 210 },
        { name: 'Nantes', x: 27, y: 35, live: true, units: 265 },
        { name: 'Tours', x: 40, y: 33, live: false, units: 0 },
        { name: 'Bordeaux', x: 31, y: 52, live: true, units: 330, importPct: 60 },
        { name: 'Toulouse', x: 41, y: 62, live: true, units: 295 },
        { name: 'Montpellier', x: 52, y: 60, live: false, units: 0 },
        { name: 'Marseille', x: 60, y: 62, live: true, units: 375 },
        { name: 'Nice', x: 70, y: 58, live: false, units: 0 },
        { name: 'Lyon Presqu’île', x: 57, y: 45, live: true, units: 440 },
        { name: 'Grenoble', x: 61, y: 49, live: false, units: 0 },
        { name: 'Dijon', x: 56, y: 33, live: false, units: 0 },
        { name: 'Strasbourg', x: 70, y: 22, live: true, units: 185 },
      ],
      affinityNote: 'Network affinity pricing: €6/unit/mo negotiated for members (34 of 120 branches live)',
    },
    storyTags: {},
  }
}

// ── C3 · Partner Bank SME Channel — the bank as distributor ─────────────────

export function buildC3PartnerBank(): PersonaSeed {
  return {
    id: 'c3-partnerbank',
    segment: 'C',
    role: 'partner',
    // §0: the bank name comes from config — one field, set before presenting.
    name: `${PARTNER_BANK.short} — SME Channel`,
    subtitle: 'The collar partner’s SME arm refers landlord customers',
    pricingTier: 'enterprise',
    epoch: EPOCH,
    historyFrom: EPOCH,
    entities: [],
    properties: [],
    leases: [],
    events: [],
    cardMonthlySpendCents: 0,
    partner: {
      referral: {
        referred: 640,
        onboarded: 212,
        balancesLandedCents: 842_000_000, // €8.42M landed on the bank's balance sheet
        collarNote: 'bank-side floor: 12 bps · current share: 29.25 bps',
      },
    },
    storyTags: {},
  }
}
