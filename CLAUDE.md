# KEYSTONE MVP — Claude Code Build Specification

> **Purpose:** presentation-grade demo for a startup competition. No real banks, payment rails, KYC providers, or market data exist. The ONLY real external API is the Anthropic API (optional, with mandatory offline fallback). Everything else is simulated deterministically. The demo must never depend on network availability on stage.

---

## 0. The one design rule

**Real logic, fake rails.** Two things are genuinely implemented because they are pure computation and they are the company's IP:

1. **The compliance engine** — six-regime rules-as-code + deterministic evaluator
2. **The double-entry ledger** — event-sourced, dimensioned, invariant-checked

Everything that would touch the outside world (bank, EMI, SEPA, card processor, KYC, tariff feeds) is a **simulator** driven by seed data and a demo clock. Never label mocked things as live; the UI may say "Simulated rail" in a subtle dev badge toggled by `?demo=clean` for the actual pitch.

---

## 1. Stack

- **Vite + React 18 + TypeScript** (SPA — no server needed; simplest to run and present)
- **Tailwind CSS** — design tokens below
- **Zustand** for state; **all domain logic in plain TS modules** under `/src/engine` (framework-free, unit-testable)
- **SQLite is NOT needed** — the ledger is an in-memory event journal, serialized to `localStorage` so state survives refresh; a "Reset demo" button restores the seed
- **Vitest** for the engine tests (rulesets + ledger invariants — these tests ARE part of the demo story: "our statutory test packs")
- **Anthropic API** for document extraction + natural-language query ONLY, called **server-side** from `/api/*` functions with the key in a non-`VITE_` env var (`ANTHROPIC_API_KEY` — never `VITE_`-prefixed, which would bundle it into public client JS); if absent or the call fails, fall back silently to the bundled canned extraction (`/src/fixtures/extracted-lease.json`) — see Addendum D (`docs/PHASE-10.md`)

### Design tokens (match the pitch deck)
```
--ink: #122A3E;  --paper: #F6F2E9;  --brass: #B98A2F;  --grey: #6E7680;
Font: Inter (or system grotesque). Left-aligned headlines. Hairline rules (1px #DDD8CC),
no gradients, no glassmorphism, no rounded pill badges, no purple/teal SaaS look.
Tabular numerals for all figures (font-variant-numeric: tabular-nums).
```

---

## 2. Repo layout

```
keystone-mvp/
  CLAUDE.md                  # summary of this spec + build phases + conventions
  src/
    engine/
      ledger/                # journal, postings, projections, invariants
      compliance/            # rulesets/*.json (FR NL ES DE AT IT), evaluator, scheduler
      indexation/            # IRL/CPI/ISTAT tables + revision calculator
      simulators/            # sddLifecycle, clock, yieldAccrual, spendEngine, realism
      savings/               # detectors over seed data
      seed/                  # deterministic seed generator (fixed RNG seed)
    ai/extract.ts            # Anthropic call + canned fallback
    ui/                      # screens & components
    fixtures/                # sample-lease.txt, extracted-lease.json, index tables
  tests/                     # vitest: ledger invariants + statutory packs
```

---

## 3. The engine (REAL code)

### 3.1 Ledger (`/src/engine/ledger`)
- Append-only `JournalEvent[]`; each event = balanced set of postings `{account, direction, amountCents, dims:{entityId, propertyId, leaseId, category}}`
- Account taxonomy (string paths):
  `assets:cash:partner_bank:{segregated_deposits|segregated_reserves|operating}`,
  `assets:receivables:rent:{leaseId}`, `liabilities:deposits_held:{leaseId}`,
  `liabilities:tenant_interest_accrued:{leaseId}`, `liabilities:owner_payable:{entityId}`,
  `income:fees:{saas|custody|savings_share|interchange}`, `income:nim_share`
- Balances/projections computed by fold over the journal (memoized)
- **Invariants asserted on every commit** (throw in dev, red banner in UI):
  Σ debits = Σ credits per event · segregated cash ≥ Σ deposit liabilities per jurisdiction · no negative segregated balances
- Two-phase movement: `intent` event → simulator "settles" → `settlement` event; failed sim → compensating event. Money is integer cents everywhere.

### 3.2 Compliance engine (`/src/engine/compliance`)
- Rulesets are **JSON data files**, one per jurisdiction, versioned, with `legal_ref` on every rule. Encode at minimum:
  - **FR**: cap 1 mo excl. charges (unfurnished) / 2 mo (furnished); no tenant interest; return 1 mo (conforming EDL) / 2 mo; **late penalty 10% of monthly rent per commenced month**
  - **NL**: cap 2 months; return 14 days; no tenant interest
  - **ES**: 1 mo fianza; mandatory regional lodgement (no float) — rule checks `lodgement_certificate != null`
  - **DE**: cap 3× Kaltmiete; payable in 3 instalments (rule: cannot demand lump sum); insolvency-proof segregation; tenant owns interest
  - **AT**: separate secure holding; tenant interest
  - **IT**: cap 3 months; tenant statutory legal-rate interest annually
- Evaluator: `(lease, ledgerState, ruleset) → Finding[]` where `Finding = {ruleId, severity, legalRef, message, remediation}`
- Remediation is a prepared action that posts real ledger events (e.g. `refund_excess` → compensating postings + finding closed)
- Deadline scheduler: durable timers anchored to lease events, driven by the **demo clock**; FR return-clock computes live penalty € exposure

### 3.3 Indexation (`/src/engine/indexation`)
Bundle small static tables (IRL quarterly values for FR, CPI for NL, ISTAT for IT — 8–10 rows each, realistic values). Calculator returns permitted new rent + generates the notice letter (template string; optionally polished by the AI call with fallback to template).

### 3.4 Simulators (`/src/engine/simulators`)
- **Demo clock**: global date, buttons `+1 day / +1 month / jump to event`; everything time-driven hangs off it
- **SDD lifecycle**: scheduled collections fire on clock ticks; a per-lease toggle can force an R-transaction (insufficient funds) → dunning FSM advances → visible in UI
- **Yield accrual**: monthly posting = balances × (DFR × 60%) to owner, Keystone share to `income:nim_share`; **rate slider (0–4%)** in the demo panel; when Keystone take < 25 bps the **failsafe fires visibly** (pricing flips to flat-fee mode, banner explains)
- **Card feed**: seeded transactions routing to property dims
- **KYC**: states only (`verified` badges), no logic

### 3.5 Savings detectors (`/src/engine/savings`)
Real detector functions over seed data + bundled "feeds" (a fake tariff table, a fake tax-comparables table): produce 4 seeded opportunities with expected € (taxe foncière appeal ~€380/yr; utility switch ~€210/yr; insurance requote ~€145/yr; MaPrimeRénov' eligibility ~€4,000 one-off). Executing one posts the success-fee ledger event and shows the **NOI bridge + asset-value impact (savings × 22 at 4.5% cap rate)**.

---

## 4. Seed data — MUST match the business model numbers

Deterministic generator (fixed seed). The canonical landlord:

- **Entity:** "Meridian Properties SCI" — owner persona "M. Laurent"
- **10 units**: 6 in France (Paris/Lyon), 2 Netherlands (Amsterdam), 2 Spain (Barcelona)
- **Balances: €125,000 total** → €25,000 deposits (≈€2,500/unit) + €100,000 reserves (≈€10,000/unit)
- Rents €900–€1,600/mo; realistic tenant names; one flat-share lease (2 co-tenants, split payments)
- **Pre-seeded story states:**
  1. One FR lease with deposit **€200 over the cap** → violation waiting with one-click refund (THE compliance demo moment)
  2. One ES lease **missing lodgement certificate** → premium-tier workflow demo
  3. One NL lease with **move-out in 10 demo-days** → return clock counting; advancing the clock past deadline shows FR-style penalty logic on a FR lease variant
  4. One lease **2 months in arrears** → dunning FSM mid-flight
  5. One lease with **indexation window opening** next demo-month
- At the base rate (2.25%) the dashboard must show **≈€171–172 revenue/unit/yr** decomposition and owner yield ≈€169 — the deck and the demo must agree. *(Superseded by Addendum D §2.4: revenue/unit is a trailing-12-month ledger fold reconciling to the per-segment model figures — A1, mid-size segment on the pro tier, shows €249; the €172 figure was the basic-tier decomposition.)*

---

## 5. Screens (7 + demo panel)

1. **Dashboard** — portfolio NOI card, balances (deposits vs reserves, segregated badge), yield YTD, compliance status ring (1 violation red), savings opportunities value, revenue/unit decomposition matching the deck
2. **Properties & Leases** — list + lease detail (regime badge, deposit state, clocks); **"New lease" wizard**: paste/upload `fixtures/sample-lease.txt` → **AI extraction** fills the form (live API or canned fallback; show extracted fields with confidence chips, money fields require confirm — "suggest-only" principle visible)
3. **Deposits & Compliance** — the centerpiece. Six-regime mini-map; findings queue; clicking the FR over-cap finding shows rule ID + legal ref (Loi 89-462 art. 22) + one-click **Refund €200** → ledger events post live → finding closes; return-clock list with the penalty ticker
4. **Money** — journal viewer (filterable by dims; this screen proves the ledger is real), payout-waterfall visual for one property (rent in → reserve top-up → vendor → owner), simulate-settlement buttons
5. **Card & Spend** — seeded transactions, per-property routing, category locks toggle (visual)
6. **Savings Engine** — opportunity queue with € values; execute the tax-appeal → NOI bridge + "asset value +€8,400" moment; success-fee posts to ledger
7. **Reports** — quittance de loyer (rendered printable HTML), FEC-style CSV export button (real file download from ledger data)
8. **Demo control panel** (gear icon, hidden in `?demo=clean`): clock controls, **DFR rate slider** (watch NIM shrink → failsafe flip at the threshold), force-R-transaction, reset-to-seed

---

## 6. Anthropic API integration (the only real external call — server-side since Phase 10)

```ts
// server/ai/extract.ts — POST https://api.anthropic.com/v1/messages
// model: claude-sonnet-4-6, key from process.env.ANTHROPIC_API_KEY (server-only).
// Browser → POST /api/extract → serverless function → Anthropic; the key
// never reaches the client. system prompt: "Extract lease fields as JSON only:
// {parties, monthly_rent_excl_charges, charges, deposit_amount, furnished,
//  start_date, jurisdiction, indexation_clause} — no prose."
// try/catch → on ANY failure return fixtures/extracted-lease.json marked source:"canned"
// server/ai/query.ts — same posture: AI translates a question into the
// PortfolioQuery DSL (src/engine/queryDsl.ts); deterministic code executes it.
```
Never block the UI on it; 6s timeout. The pitch works fully offline.

---

## 7. Build phases (commit at each checkpoint)

1. **Engine first, no UI**: ledger + invariants + FR/NL/ES rulesets + vitest statutory packs green
2. Seed generator + demo clock + simulators; console-verifiable
3. Shell + Dashboard + Compliance screen (the demo core)
4. Money journal + Leases + AI wizard with fallback
5. Savings + Reports + Card + demo panel + rate-slider failsafe
6. Polish pass against design tokens; `?demo=clean`; README with the 3-minute demo script
7. **Personas & segment demos** (Addendum A — `docs/CLIENT-PERSONAS.md`): persona seed modules for A1–A3 / B1–B3 / C1–C3, login-style persona picker + demo-panel quick switch, UI-only RBAC by role (`owner`, `property_manager`, `institution`, `partner`), OwnerRollupTable + RentRollImportWizard (B1), LenderPack (B3), PartnerConsole (C1), WhiteLabelTheme (B2), BranchMap (C2). B1 and C1 are the must-work personas; the rest must at least load with seeded data.
8. **Dashboard depth, analytics & navigation** (Addendum B — `docs/DASHBOARD-DEPTH.md`): §0 ledger reconciliation first (every headline figure folds from journal events, per-persona test within €1), role-specific dashboard widget grids (arrears aging, payout run, lease-events calendar, cash-flow timeline, NOI bridge, covenant tiles), Recharts cash-flow + NOI-bridge hero charts, five-detector savings engine with status panel/confidence/logic trails, Money roll-up levels (portfolio → owner → property → lease), Cmd-K global search with deep links, analytics-first Card & Spend with outlier flags feeding the savings engine, compliance-colored SVG property map with detail cards.
9. *(skipped — numbering follows Addendum D, which names the back-end phase 10 and defers front-end polish to phase 11)*
10. **Curated-dataset back-end & AI roles** (Addendum D — `docs/PHASE-10.md`): the generator runs ONCE at seed time (`npm run seed`, idempotent) and persists each persona's 12-month journal to Postgres (`DATABASE_URL`) or embedded file-backed PGlite (zero accounts, offline); a framework-free back-end API (`server/handlers.ts`, served by Vite middleware in dev and a Vercel function `api/[...path].ts` deployed) exposes dataset/portfolio/compliance/savings/rollup/FEC/events/extract/query/system; the front-end queries the API and POSTs mutations (ledger invariants re-enforced server-side, optimistic concurrency), falling back silently to the in-browser engine when the API is unreachable; historical DFR path + per-segment revenue targets as ledger folds (€177/€249/€203/€124/€264); AI extraction (§4.1) and natural-language portfolio query (§4.2 — Cmd-K "Ask" mode over the PortfolioQuery DSL) run server-side with `ANTHROPIC_API_KEY`, canned fallback; `/system` audit view (§6, hidden in `?demo=clean`). Front-end polish deferred to Phase 11.
10.5. **Data realism** (Addendum D2 — `docs/DATA-REALISM.md`, slotted before Phase 11): the 12-month generator produces data that reads as a real rental operation — non-round per-city rents with separate charges lines; per-lease payment days (1st/3rd/5th/10th) with settlement scatter and consistent per-tenant punctuality personalities; business-day rolls; vacancy gaps; arrears ARCS (miss → partial catch-up → recover, payment plans) with varied R reasons (AM04/MD07/MS02/AC04); lumpy seasonal vendor spend (Poisson repairs, log-normal amounts, winter heating cluster, annual insurance hits, capex spikes); engineered utility anomaly the outlier detector finds IN the data; event-clustered card feed with country-appropriate merchants and time-of-day; per-persona calibration (BTR tight, housing-association social with benefit splits). All keyed-PRNG deterministic; aggregates still reconcile to the model figures (±€1, tested); `npm run verify-realism` prints the per-persona report.
11. **Front-end, money rails & production feel** (Addendum E — `docs/PHASE-11.md`): §6 design-system consolidation first (component library Card/Stat/Badge/Dialog/Toast/EmptyState/Skeleton/CountUp, one number-formatting utility app-wide, focus rings, purposeful motion only); the **money-rails screen** — partner bank as a single config field (`PARTNER_BANK` in `src/config.ts`; set to Deutsche Bank AG for this engagement), tripartite diagram (tenant → virtual IBAN → EMI/escrow class → partner-bank vault with ring-fenced deposit/reserve pools + DGS badge) with Keystone drawn BESIDE the flow ("funds never enter Keystone's balance sheet"), two-phase settlement animated over REAL journal events (states, correlation ids = event ids, monotonic timestamps, the actual intent→settlement/compensation postings, demoable failure path via Force R + confirm), connections strip with heartbeats and Simulated tags, Money rows click through pre-focused; §2 production states (error boundary per view, deliberate empty states, skeletons where async exists, confirmation dialogs before every money move, settlement toasts); §3 micro-interactions (just-posted row flash, count-up hero figures, clean persona switch with scroll reset); §4 notification bell + dashboard action-required queue derived live from findings/clocks/arrears/journal (clock-driven — advancing the clock changes it); §5 trust surface (DGS tooltip, synced/local chip, procurement cues). Rail providers named by CLASS only; "Simulated rails" badge everywhere money moves, hidden in `?demo=clean`.

12. **Landing page, login & access layer** (Addendum F — `docs/PHASE-12.md`): the institutional front door — a marketing site (Home hero + arch motif + proof strip + pillars + how-it-works band · The Firm with the four founders and the target-partners line · Services grouped by segment · Insight article cards · Contact form) in the editorial aesthetic; Client Access login with six visible demo credentials (shared password `keystone`, one-click "sign in as") replacing the persona picker (DemoPanel keeps the quick-switch); path routing `/` `/firm` `/services` `/insight` `/contact` `/access` `/app` with sessionStorage sessions — fresh visit lands on Home, `/app` is gated, logout returns Home, datasets persist untouched; RBAC enforced in navigation (role-scoped nav + screen guard redirects to the role's home) AND in data (`POST /api/session` mints a persona-scoped token; every API request carries it; cross-persona reads/mutations 403 server-side, before any db work); `?demo=clean` auto-skips the landing for stage switching.
12. **Landing page, login & access layer** — see the entry above.
13. **Prototype realism & access correctness** (Addendum G — `docs/PHASE-13.md`): the prototype behaves like the shipping product — "Simulated rails"/preset "KYC verified" badges, the demo-clock control and presenter-facing copy removed; ONE quiet "About this prototype" disclosure (app sidebar + landing footer) states what is real vs represented; clients never see Keystone's economics (revenue/unit decomposition replaced by the client's own value summary: yield + savings vs fees paid — Keystone figures live only in internal views); properties group by region with collapsible summaries and INLINE property detail (accordion under the row, capped rendering for 850-unit portfolios); occupancy computed from real move-in/out events over a trailing 12-month window (natural turnover generator: move-out → deposit returned in-clock → void → re-let); printing outputs only the report artifact; a real gated KYC/KYB flow (document → liveness → sanctions/PEP; registry → UBO resolution → per-UBO KYC → company screen) where "verified" is earned and persisted; Payment Rails leaves the nav and becomes a contextual per-transaction processing view (states, postings, refs — no lecture, no labels).

**Acceptance:** `npm test` green (invariants + statutory packs) · full flow works with network disabled · dashboard numbers reconcile to the per-segment model figures (€249/unit for A1 since Addendum D; originally €172 on the basic tier) · one-click remediation posts visible ledger events · rate slider triggers failsafe below threshold · **persona switcher works (reset journal → load persona seed → set role → apply theme) · B1 demo end-to-end: 42-owner roll-up, drill-down, CSV rent-roll import committing ledger onboarding events, 7% manager-fee waterfall · C1 demo end-to-end: Partner Console with API keys, webhook delivery log, rev-share dashboard, 60,000→4,200 activation funnel · switching back to A1 still reconciles to its segment figure · **dashboard reconciles to ledger folds (per-persona test, ±€1) · no empty dashboard region for any persona · savings shows ≥5 seeded opportunities with logic trails · Money has a working portfolio/owner roll-up · Cmd-K resolves a tenant by name · **Phase 10: curated 12-month dataset persisted per persona (`npm run seed`) · front-end generates nothing when the API is up — it queries, and mutations POST events that the server re-validates (unbalanced → 422, stale baseSeq → 409) · per-segment revenue/unit reconciles to the model as ledger folds (±€1, tested) · extraction and NL query run via serverless functions with the key server-side only, invisible canned fallback with network off · Cmd-K Ask answers ≥3 seeded questions over the dataset · `/system` shows endpoints, persisted journal counts, ruleset versions and live reconciliation, and is hidden in `?demo=clean` · full core demo runs with the AI API disabled · **Phase 10.5 (D2): no round-number rents · payment days vary per lease with naturally scattered, personality-consistent settlement · spend lumpy and seasonal (Poisson/log-normal, ≥1 capex spike) with a genuine utility anomaly in the data · card feed event-clustered, non-round, country-appropriate merchants with time-of-day · arrears show arcs (recovery, slide, payment plan), not uniform lateness · mid-year indexation step, vacancy gaps and lease events distributed across the year · every persona's aggregates still reconcile (tested) · same seed → identical dataset · `npm run verify-realism` report exists · **Phase 11 (E): partner bank is a config field (`src/config.ts`), no bank name hard-coded in any rails view · Money rows click through to the rails screen pre-focused · two-phase settlement animates real states/ids/timestamps with the parallel ledger postings and a demoable failure path (Force R → compensating entry) · error boundary per view, deliberate empty states, confirmation dialog before every money move, settlement toasts · just-posted ledger rows flash, hero figures count up, persona switch resets scroll with no stale flash · notification bell + dashboard action queue deep-link and respond to the demo clock · number formatting via one utility app-wide · `?demo=clean` hides all simulated-rails chrome · no layout break at 1920×1080 · **Phase 12 (F): every fresh load with no session lands on the marketing Home · six persona logins each enter their RBAC-scoped app on the correct home screen, one-click "sign in as" needs no typing · a role cannot reach another role's routes or data (403 tested server-side) · logout returns to Home · landing reads as a real European fintech in the Keystone aesthetic, no real bank logo, real bank name only on the target-partners line · datasets persist across logins (login/logout never reseeds) · **Phase 13 (G): no Simulated-rails badge, preset KYC badge, demo-clock control or presenter notes anywhere in the UI · one About-this-prototype disclosure off the working screens · properties group by region with inline detail directly below the row · occupancy fluctuates over a real 12-month window computed from lease events (tested) · printing a report outputs only that report · gated KYC/KYB with UBO resolution — verified only by completing the flow (tested) · no client-facing screen/report/export shows Keystone's revenue/unit, take or margin · Payment Rails out of the nav, transaction processing reachable contextually without simulated labels · a judge can click through the whole product without hitting a "this is a demo" seam.**

---

## 8. Three-minute demo script (put in README)

1. Dashboard: "Ten units, three countries, €125k under management — one violation." *(10s)*
2. Compliance: open the FR over-cap finding — rule, statute, one click, watch the ledger post. "Legal by construction." *(45s)*
3. Leases: paste the sample lease → AI extracts → confirm money fields. "Deterministic core, probabilistic edges." *(40s)*
4. Money: the journal. "Every euro, dimensioned, double-entry, auditable." *(20s)*
5. Savings: execute the tax appeal — NOI bridge, +€8,400 asset value. "The fee buys the account; the savings pay for everything." *(30s)*
6. Demo panel: drag rates to zero — failsafe flips pricing, floor holds. "We modeled the bad weather." *(25s)*
7. Reports: quittance + FEC export. "And the accountant says yes." *(10s)*
```
