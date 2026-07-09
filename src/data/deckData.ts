/**
 * Deck Brief v4 §0 — the single source of truth for the pitch deck.
 * EVERY number, price, name and figure rendered in a slide is imported from
 * this file; slide components carry no content literals of their own.
 */

export const deck = {
  founders: ['Leon Ban', 'Badriah Al-Besharah', 'Duong Bui', 'Mark Gebrane'],
  year: 2026,
  persona: { name: 'Laurent', desc: '12 units across Paris and Lyon' },

  market: {
    // Eurostat: Final consumption expenditure of households (nama_10_co3_p3),
    // COICOP item CP041 "Actual rentals for housing", EU27_2020, current prices.
    // Actuals (reported): 2020 €159.4bn · 2021 €167.8bn · 2022 €176.8bn
    rentActual2022: '€176.8bn',
    rentHistGrowth: '≈ 5.3%/yr nominal (2020–22)',
    rentProjected2026: '≈ €208bn', // central scenario, 4.2% CAGR from 2022 base
    rentProjected2030: '≈ €246bn', // central scenario
    provenance:
      "Eurostat nama_10_co3_p3, item CP041 'Actual rentals for housing', EU27. 2022 actual €176.8bn; projections at 4.2% CAGR (central scenario).",
    deDepositPool: "Germany's deposit pool alone: est. €25–50bn",
  },

  problem: {
    hoursPerUnit: '5–10 h / property / month', // footnote: internal estimate, landlord interviews
    missedIndexation: '1.5–3.5% of rent lost / yr when indexation is missed',
    frPenalty: 'late deposit return: 10% of monthly rent per month (FR)',
    disputeCost: "a lost deposit dispute ≈ one month's rent or more",
  },

  valueProp:
    'We help European rental owners manage the full financial life of their portfolio by unifying rent, deposits, compliance, bookkeeping, and treasury into one intelligent account — compliant by construction, and built to actively cut costs and grow idle cash.',

  revenue: {
    fullStackPerUnit: 225,
    saas: 96,
    savingsFee: 37.5,
    nim: 76,
    interchange: 16,
    custody: 12,
    rateIndependentShare: '~two-thirds',
  },

  pricing: [
    { segment: 'Solo landlord', plan: 'Basic', eurPerUnitMo: 7 },
    { segment: 'Mid landlord (5–50 units)', plan: 'Pro', eurPerUnitMo: 12 },
    { segment: 'Property manager', plan: 'Enterprise', eurPerUnitMo: 6 },
    { segment: 'Housing association', plan: 'Enterprise', eurPerUnitMo: 5 },
    { segment: 'Institutional BTR', plan: 'Enterprise', eurPerUnitMo: 8 },
  ],

  forecast: [
    // 5-year, year-by-year
    { yr: 'Y1 2027', units: 3000, revM: 0.5, ebitdaPct: null as number | null, note: 'build & launch year' },
    { yr: 'Y2 2028', units: 12000, revM: 2.1, ebitdaPct: -40 as number | null, note: undefined as string | undefined },
    { yr: 'Y3 2029', units: 30000, revM: 5.4, ebitdaPct: 0 as number | null, note: '≈ breakeven' as string | undefined },
    { yr: 'Y4 2030', units: 75000, revM: 15.0, ebitdaPct: 15 as number | null, note: undefined as string | undefined },
    { yr: 'Y5 2031', units: 160000, revM: 34.2, ebitdaPct: 26 as number | null, note: undefined as string | undefined },
  ],

  kpis: {
    balancesY5: '≈ €2.0bn',
    revPerUnitPath: '€150 → €214',
    grossMarginPath: '73% → 82%',
    cacPayback: '< 12 months (enterprise)',
  },

  landlordROI: {
    value: 486,
    fees: 96,
    cover: '≈ 5×',
    parts: { yieldKept: 169, softwareReplaced: 160, savingsKept: 113 },
  },

  ask: {
    amount: '€1.5M',
    months: 24,
    use: [
      ['Product & engineering', 50],
      ['Go-to-market', 30],
      ['Regulatory & market entry', 15],
      ['G&A', 5],
    ] as [string, number][],
    buys: '24 months runway · first 10–12,000 units live · Series A proof points (retention, revenue/unit, enterprise contracts)',
  },

  // ── supporting fields (same source-of-truth rule) ──────────────────────────

  contactEmail: 'contact@keystone.eu',
  prototypeUrl: 'https://keystone-mvp.vercel.app',

  /** Slide 8 — role per founder (credibility lines are bracketed placeholders). */
  team: [
    { name: 'Leon Ban', role: 'Product & engineering', line: '[credibility line — to fill]' },
    { name: 'Badriah Al-Besharah', role: 'Regulatory & operations', line: '[credibility line — to fill]' },
    { name: 'Duong Bui', role: 'Finance & treasury', line: '[credibility line — to fill]' },
    { name: 'Mark Gebrane', role: 'Growth & partnerships', line: '[credibility line — to fill]' },
  ],

  /** Slide 10 — the bracketed traction placeholder (fill or delete before presenting). */
  tractionPlaceholder:
    "[e.g. '25 landlord interviews conducted — top pains: reconciliation hours, deposit disputes' · 'X property managers have seen the demo' · 'advisor: NAME, role']",

  /** Appendix — Eurostat CP041 detail (actuals reported; projections labeled). */
  marketAppendix: {
    actuals: [
      ['2020', '€159.4bn'],
      ['2021', '€167.8bn'],
      ['2022', '€176.8bn'],
    ] as [string, string][],
    growthNote: 'growth ≈ 5.3%/yr nominal (2020–22)',
    scenarios: [
      ['2026 (projected)', '€203bn (3.5% CAGR)', '€208bn (4.2%)', '€217bn (5.2%)'],
      ['2030 (projected)', '€233bn', '€246bn', '€265bn'],
    ] as [string, string, string, string][],
    scenarioHeads: ['Year', 'Conservative', 'Central', 'Trend'],
    caveat:
      'CP041 measures tenant cash rent (household consumption); excludes imputed owner-occupier rent — a conservative floor on European rental flows.',
  },

  /** Appendix — the regime table (facts as encoded in the compliance engine). */
  regimes: [
    { code: 'FR', status: 'Live', cap: '1 month excl. charges (2 furnished)', holding: 'held by landlord', interest: 'none owed to tenant', clock: 'return 1–2 months · late: 10% of monthly rent / commenced month' },
    { code: 'NL', status: 'Live', cap: '2 months', holding: 'held by landlord', interest: 'none owed to tenant', clock: 'return 14 days' },
    { code: 'ES', status: 'Live', cap: '1 month (fianza)', holding: 'mandatory regional lodgement — no float', interest: 'n/a (lodged)', clock: 'per regional scheme' },
    { code: 'DE', status: 'Engine-ready', cap: '3× Kaltmiete · payable in 3 instalments', holding: 'insolvency-proof segregation', interest: 'tenant owns interest', clock: '—' },
    { code: 'AT', status: 'Engine-ready', cap: '—', holding: 'separate secure holding', interest: 'tenant interest', clock: '—' },
    { code: 'IT', status: 'Engine-ready', cap: '3 months', holding: 'held by landlord', interest: 'statutory legal-rate interest annually', clock: '—' },
  ],
}
