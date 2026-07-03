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
- **Anthropic API** via `fetch` for document extraction ONLY, key from `VITE_ANTHROPIC_KEY` env; if absent or the call fails, fall back silently to the bundled canned extraction (`/src/fixtures/extracted-lease.json`)

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
      simulators/            # bankRail, sddLifecycle, clock, yieldAccrual, cardFeed
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
- At the base rate (2.25%) the dashboard must show **≈€171–172 revenue/unit/yr** decomposition and owner yield ≈€169 — the deck and the demo must agree.

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

## 6. Anthropic API integration (the only real network call)

```ts
// src/ai/extract.ts — POST https://api.anthropic.com/v1/messages
// model: claude-sonnet-4-6, system prompt: "Extract lease fields as JSON only:
// {parties, monthly_rent_excl_charges, charges, deposit_amount, furnished,
//  start_date, jurisdiction, indexation_clause} — no prose."
// try/catch → on ANY failure return fixtures/extracted-lease.json marked source:"canned"
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

**Acceptance:** `npm test` green (invariants + statutory packs) · full flow works with network disabled · dashboard numbers reconcile to €172/unit · one-click remediation posts visible ledger events · rate slider triggers failsafe below threshold.

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
