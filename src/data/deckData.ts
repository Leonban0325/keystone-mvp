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
    // Germany fix: §551 BGB requires interest-bearing deposits with interest
    // to the tenant, so no "German deposits idle at 0%" claim anywhere.
    idleFraming:
      'In France, deposits are held by the landlord, often in non-interest-bearing accounts, and reserves sit idle. Across Europe, billions in deposit and reserve cash earns nothing.',
  },

  problem: {
    hoursPerUnit: '5 to 10 hours / property / month', // footnote: internal estimate, landlord interviews
    missedIndexation: '1.5 to 3.5% of rent lost / yr when indexation is missed',
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
    grossFullAdoption: 237.5, // the five lines at full adoption; €225 is blended across the mix
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
    // Option B math: fees paid = SaaS + custody only. The NIM share and the
    // savings fee come out of money the landlord gains, not his pocket.
    valueReceived: 442, // 169 + 160 + 113
    parts: { yieldKept: 169, softwareReplaced: 160, savingsKept: 113 },
    feesPaid: 156, // SaaS Pro €144 (€12/unit/mo × 12) + custody €12
    cover: 'about 2.8x', // 442 / 156
  },

  ask: {
    amount: '€750k',
    months: 18,
    structure: 'about 12% equity (SAFE or priced), about €6M post-money', // CONFIRM with team
    investorsGet:
      'about 12% equity at roughly €6M post-money, plus a board observer seat, funding the step from working prototype to first paying cohorts', // CONFIRM
    use: [
      ['Product & engineering', 50],
      ['Go-to-market', 30],
      ['Regulatory & market entry', 15],
      ['G&A', 5],
    ] as [string, number][],
    buys: '18 months runway to first revenue · first 8 to 10,000 units live · proof points for seed/Series A: retention, revenue per unit, signed enterprise contracts',
  },

  /** Appendix F — how the €750k was derived (Q&A only). Founders draw no
   *  salary; capital goes into building and market entry, not team income. */
  askDerivation: {
    intro:
      'How the €750k ask was derived (18-month runway to first revenue). Founders draw no salary; capital goes into building and market entry, not team income.',
    groups: [
      {
        group: 'People (hire + bought expertise)',
        items: [
          ['Technical/compliance hire, months 6 to 18 (fully loaded)', '€75k', '10%'],
          ['Regulatory/fintech legal + compliance consultant (contract)', '€90k', '12%'],
        ] as [string, string, string][],
      },
      {
        group: 'Product & engineering',
        items: [
          ['Partner-bank & rails integration (onboarding, sandbox → prod)', '€45k', '6%'],
          ['Cloud, ledger infra, tooling, AI/document-extraction APIs', '€30k', '4%'],
          ['Security audit + penetration test (partner-bank requirement)', '€25k', '3%'],
          ['Compliance ruleset build & external legal validation', '€20k', '3%'],
        ] as [string, string, string][],
      },
      {
        group: 'Go-to-market',
        items: [
          ['First-market pilots (FR/NL/ES): BD, onboarding, cohort support', '€110k', '15%'],
          ['Brand, website, deck, materials', '€25k', '3%'],
        ] as [string, string, string][],
      },
      {
        group: 'Regulatory & registration',
        items: [
          ['Payment-agent registration, filings, EMI-authorisation groundwork', '€75k', '10%'],
        ] as [string, string, string][],
      },
      {
        group: 'Operating & buffer',
        items: [
          ['G&A (accounting, admin, insurance, subscriptions, 18 mo)', '€40k', '5%'],
          ['Contingency (~13%)', '€90k', '12%'],
        ] as [string, string, string][],
      },
    ],
    total: ['Total', '€750k', '100%'] as [string, string, string],
    reconciliation: [
      'Product & engineering ≈ €375k (50%): technical hire + integration + infra + security + ruleset build + about half the legal/compliance contractor.',
      'Go-to-market ≈ €225k (30%): pilots + brand/materials + GTM share of contingency.',
      'Regulatory & market entry ≈ €112k (15%): registration/filings + regulatory-legal share.',
      'G&A ≈ €38k (5%): accounting, admin, insurance, operating overhead.',
      '(Two views of the same €750k: one by line item, one by function.)',
    ],
    confirm:
      "[Hire cost (€75k fully loaded) and pilot budget (€110k) are the two figures to confirm against the team's real first-market plan; all other lines are grounded in standard European pre-seed costs.]",
  },

  /** Slide 7 — four real tiers. Companies named with what they DO only; no
   *  funding amounts or valuation multiples on the slide. */
  competition: {
    headline: { roman: 'No one does all of it.', italic: 'Everyone does a slice.' },
    tiers: [
      {
        tier: 'Deposit & escrow fintechs',
        closest: true,
        names: 'Getmomo, Mietwise (DE) · Evorest (CH) · Garantme, Depopass (FR)',
        does: 'single-country; tenant-keeps-yield or insurance, not owner-split custody + rails + treasury',
      },
      {
        tier: 'Landlord SaaS / apps',
        closest: false,
        names: 'August, Lendlord (UK) · Rentila, Beanstock (FR) · Proper (NL/DE/DK)',
        does: 'win operations and reconciliation; do not hold deposit money or run multi-country compliance',
      },
      {
        tier: 'Traditional banks',
        closest: false,
        names: 'Sparkassen · CaixaBank · VP Bank',
        does: 'legal deposit accounts, but manual, flat-fee, no yield automation, single-country',
      },
      {
        tier: 'Pan-European deposit / wealth infra',
        closest: false,
        names: 'Raisin (closest public comp)',
        does: 'cross-border yield marketplace, no tenancy-lifecycle compliance engine or rent rails',
      },
    ],
    moat: 'The only platform combining cross-border compliance, automated rent rails, and owner deposit-yield sharing on one ledger.',
  },

  /** Appendix — "The math" (Q&A only, not presented). */
  math: {
    model: [
      'Balances / unit = €2,500 deposit + €10,000 reserve = €12,500',
      'NIM = €12,500 × (27% × 2.25%) = €12,500 × 0.6075% = €75.94',
      'SaaS ≈ €96 (blended) · Custody = €1 × 12 = €12 · Interchange ≈ €16 (≈ €2,000 spend × 0.8%) · Savings fee = 25% × documented savings ≈ €37.50',
      'Full stack ≈ €225 · rate-independent ≈ €161 (about two-thirds) · at ECB 2.25%',
      'The five lines sum to €237.50 gross at full adoption; €225 is the blended figure across the client mix (not every unit adopts card + savings fully).',
    ],
    forecastDetail: [
      'Revenue(yr) = units × revenue-per-unit that year:',
      'Y1 3,000 × €150 ≈ €0.5M · Y2 12,000 × €165 ≈ €2.1M · Y3 30,000 × €180 ≈ €5.4M · Y4 75,000 × €200 ≈ €15.0M · Y5 160,000 × €214 ≈ €34.2M',
      'EBITDA margin = gross margin − opex/revenue: gross margin 73% → 82% (fixed platform cost spread over more units); opex falls as % of revenue with scale → EBITDA −40% (Y2) → breakeven (Y3) → +26% (Y5).',
    ],
    metrics: [
      'Balances Y5 = 160,000 × €12,500 = €2.0bn.',
      'Revenue/unit €150 → €214 = rising card + savings adoption over 5 yrs.',
      'Gross margin 73% → 82% = platform + partner costs about fixed, spread over a growing unit base.',
      "CAC payback < 12 mo = enterprise/partnership contracts land many units per sale, so cost per unit is low and recovered within a year of that contract's revenue.",
    ],
    roi: [
      'Value: yield kept €169 + software replaced €160 + savings kept €113 = €442',
      'Fees: SaaS Pro €144 (€12 × 12) + custody €12 = €156',
      'Cover = 442 / 156 ≈ 2.8x',
      'Fees paid = SaaS + custody only; the NIM share and savings fee come out of money the landlord gains, not his pocket.',
    ],
    financials: [
      'revenue = units × revenue/unit (path €150 → €214 as card + savings adoption rises)',
      'e.g. Y5: 160,000 × €214 ≈ €34.2M · Balances Y5 = 160,000 × €12,500 = €2.0bn',
    ],
  },

  // ── supporting fields (same source-of-truth rule) ──────────────────────────

  contactEmail: 'contact@keystone.eu',
  prototypeUrl: 'https://keystone-mvp.vercel.app',

  /** Slide 8 — role per founder (credibility lines are bracketed placeholders). */
  team: [
    { name: 'Leon Ban', role: 'Product & engineering', photo: '/photos/leon-ban.jpg' },
    { name: 'Badriah Al-Besharah', role: 'Regulatory & operations', photo: '/photos/badriah-al-besharah.jpg' },
    { name: 'Duong Bui', role: 'Finance & treasury', photo: '/photos/duong-bui.jpg' },
    { name: 'Mark Gebrane', role: 'Growth & partnerships', photo: '/photos/mark-gebrane.jpg' },
  ],

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
