# KEYSTONE MVP — Addendum D: Phase 10 — Curated-Dataset Back-end & AI Roles

> Companion to Addenda A–C. Phase 10 turns the demo from a browser-seeded app into a **real back-end serving a curated, persisted 12-month dataset per persona**. No real banks, rails, KYC, or market data — the dataset is deterministic fixture data, generated once and stored. Front-end polish is deferred to **Phase 11**. **Principle unchanged:** deterministic core, probabilistic edges; AI operates only at the language boundary, never in the money or compliance decision path.

---

## 1. Architecture shift — persisted curated data, real API

**From:** browser runs the seed generator on every load; state in `localStorage`.
**To:** the generator runs once at seed-time and writes a 12-month event journal for every persona into a hosted database; a back-end API serves the front-end, which now *queries* rather than *generates*.

```
Seed generator (deterministic, run once)
        │  writes
        ▼
Hosted Postgres (Neon / Supabase free tier)
  event_journal · leases · properties · entities · personas · rulesets
        │  read/replay
        ▼
Back-end API (Vercel serverless functions · REST or tRPC)
  /portfolio /ledger /compliance /savings /documents /extract /query
        │  JSON
        ▼
Front-end (queries the API like a real client — generates nothing)
```

Why this matters for the pitch (each becomes literally true, not asserted):
- **Persistence** — survives refresh and survives judges poking a shared link; per-session isolation if needed.
- **Event-sourcing is real** — the journal lives in a database and replays; "auditable" is demonstrable.
- **A real API boundary exists** — a technical judge can be shown the endpoints; the partner-integration story (PMS embeds against this API) is concrete, not hypothetical.

**Explicitly NOT built** (say confidently these are the funded build, bought not built): real bank/EMI/card connections, real KYC provider calls, full auth with real user accounts. Simulated-rails badge stays. Persona switch = load that persona's dataset scope, not a real login.

---

## 2. The curated 12-month dataset (per persona)

The dataset IS the product in demo form. Generated deterministically (fixed RNG seed), curated so each persona's 12 months tells that persona's specific story. Persisted, not runtime.

### 2.1 Generation
- One generator, parameterised per persona (unit count, country mix, reserve/unit, tier, adoption). Emits a chronological `JournalEvent[]` from `demoStart − 12 months` to `demoStart`; "today" sits at the end so the clock steps forward into new cycles via the **same code path**.
- Historical **DFR path** (rates moved over the year) so yield postings have real month-by-month shape.
- Written to Postgres via a `seed` script that is idempotent and re-runnable (`npm run seed`).

### 2.2 What each persona's 12 months contains (scaled to unit count)
- Monthly rent cycles (SDD events, a few late/recovered, seasonal vacancy)
- Vendor spend, recurring + irregular, country-appropriate names, with real outliers for the spend detector
- Monthly yield accrual at the historical rate
- Compliance history: findings **raised and remediated** over the year (track record: "14 resolved, avg 2.3 days"), plus the currently-open story-states
- Savings **already executed** in prior months (tax appeal won in March, utility switch in April) so the NOI bridge shows accumulation
- Lease events: move-ins/outs, a deposit returned within its clock, an indexation applied

### 2.3 Per-persona curation (the story each dataset tells)
- **Small / mid landlord** — the core loop; mid-landlord shows rich adoption and the ~€249/unit economics
- **Property manager** — 42 owners, 3 with open findings, one CSV onboarding mid-flight, manager-fee in the waterfall
- **Housing association** — pooled treasury (low float), huurtoeslag flows, social-mode arrears, procurement posture
- **Institutional BTR** — covenant tiles from a seeded loan agreement (one amber), fianza lodgement at scale
- **Partners** — activation funnels and webhook history as persisted events

### 2.4 Reconciliation (blocking)
Every dashboard headline and per-segment figure = fold over the persisted journal, asserted in tests. Per-segment revenue/unit must match the model's Revenue-by-Client tab (€177 / €249 / €203 / €124 / €264). No hard-coded scalars anywhere.

---

## 3. Back-end services (real code over curated data)

- **Ledger service** — reads/replays the journal; computes projections and roll-ups (portfolio / owner / property / lease); enforces invariants on any new event (clock-driven or remediation).
- **Compliance service** — evaluates the versioned rulesets against persisted lease + ledger state; serves findings and executes remediations (which post real events back to the journal).
- **Savings service** — runs detectors over the curated dataset + bundled fixture "feeds" (tariff table, tax comparables); serves the opportunity queue with logic trails; executes success-fee events.
- **Document service** — generates quittances, statements, exports (FEC-style CSV) from ledger data.
- **Extract & Query services** — the two AI endpoints (§4).
- All endpoints deterministic given the seed; every AI endpoint has a canned fallback so the system runs with the AI API down.

---

## 4. AI API — which systems call it, and how the key is handled

**The key.** The app calls Anthropic's API (there is no free "Vercel AI" — Vercel hosts; Anthropic serves and meters the model). Get one **Anthropic API key** from console.anthropic.com. It is pay-as-you-go, not a subscription; each extraction/query costs a fraction of a cent, so the account's starter credit typically covers an entire competition. The chat subscription is a separate product and cannot be used by the app.

**Non-negotiable safety rule.** The key is **server-side only** — held by a Vercel serverless function, read from a non-`VITE_` env var (`ANTHROPIC_API_KEY`). It must NEVER be a `VITE_`-prefixed variable, because anything `VITE_` is bundled into client JS and is publicly readable on the deployed URL. Every AI call goes browser → our serverless function → Anthropic; the key never reaches the browser.

**Unifying rule (say this to judges):** AI reads and writes *language* at the edges; deterministic rules and the ledger decide everything with financial or legal consequence. Every AI use runs on curated fixture data, never real data, and every AI endpoint has a canned fallback so the system runs fully with the AI API disabled.

### Which systems use the API vs. which are always canned

| System | Uses Anthropic API? | Behaviour without a key |
|---|---|---|
| 4.1 Document extraction | **Yes** (live, server-side) | Falls back to `fixtures/extracted-lease.json`, invisibly |
| 4.2 Natural-language query | **Yes** (live, server-side) | Falls back to pre-mapped example Q&As |
| 4.3 Savings outreach drafting | Optional | Template letters/emails |
| 4.4 Document generation | Optional | Template quittances/statements |
| Everything else (ledger, compliance, savings detection, roll-ups, reports, dashboards, clock, rate slider) | **No — never** | Deterministic, no AI involved at all |

Only the four language tasks above ever touch the API. The entire financial and compliance core is deterministic and runs with zero AI. This is both the safety story and the correctness story.

### 4.1 Document extraction — PRIMARY, load-bearing, live
`POST /api/extract` (serverless function, key server-side). Paste a lease -> AI extracts the typed schema (parties, rent excl. charges, charges, deposit, furnished, jurisdiction, start date, indexation clause). Feeds the deterministic compliance engine; **never overrides it**. Per-field confidence; money fields require confirm. 6s timeout. Fallback: `fixtures/extracted-lease.json`, rendered identically. The marquee AI moment and the one genuine production use of AI in the architecture.

### 4.2 Natural-language portfolio query — HIGH-IMPACT, second priority
`POST /api/query` (serverless, key server-side). "Which French units have deposits above cap?" / "Arrears over 60 days for owner Laurent?" -> AI translates the question into a **structured query** against the curated dataset -> returns the answer plus the underlying rows. Read-only over fixed data (safe); showcases the dimensioned ledger; evolves the Cmd-K bar into something that looks ahead of competitors. Fallback: a set of pre-mapped example questions.

### 4.3 Savings reasoning & outreach drafting — time-permitting
Detection stays deterministic; the AI (via a serverless endpoint) drafts the *artifact*: the taxe-fonciere appeal letter, the vendor-renegotiation email, the plain-language rationale for a flagged opportunity. Makes the engine feel intelligent without letting a model invent numbers. Fallback: templates.

### 4.4 Document generation from ledger facts — time-permitting
The AI (serverless endpoint) drafts prose/formatting for quittances, regularisation statements, the itemised deposit-return letter, the lender-pack narrative — from structured ledger facts. Facts from the ledger (deterministic); language from AI. Fallback: templates.

**Priority:** ship 4.1 solid and server-side first; add 4.2 as the high-impact second; treat 4.3/4.4 as polish.

---

## 5. Deployment & data safety

- Postgres on Neon/Supabase free tier; connection string as a **server-side** env var (never `VITE_`).
- `ANTHROPIC_API_KEY` set **only** as a server-side env var on Vercel, consumed exclusively inside `/api/*` serverless functions. Never `VITE_`-prefixed, never imported in client code.
- **Recommended demo posture:** the public Vercel link runs with the AI endpoints falling back to canned output (no key needed, nothing to leak); the presentation laptop (local dev, or a private preview deployment with the key set) runs the live extraction and query. Real-AI flourish where it matters, leak-proof public URL.
- `npm run seed` populates a fresh database deterministically; a "reset demo" admin endpoint restores it.
- Works on-stage: if the AI API or network drops, every AI endpoint falls back to canned output; the curated dataset is already persisted, so the core demo is fully offline-capable except the live-extraction flourish.

## 6. "Open the hood" — make the real back-end visible (high pitch value)

A `/system` view for technical judges (hidden in `?demo=clean`): live event-journal stream, compliance rules evaluating with inputs→outputs, reconciliation tests passing, and the API endpoints listed with example responses. The engine already computes for real; this makes its realness *inspectable* rather than buried — the strongest possible answer to "is this actually built or just a mockup?"

---

## 7. Build order & scope

1. **Postgres + seed script** — generate and persist 12 months for all personas; `npm run seed` idempotent.
2. **Back-end API** over the persisted data (ledger, compliance, savings, documents); front-end switched to query it.
3. **Reconciliation tests** — per-persona headline = journal fold; per-segment = model figures.
4. **AI 4.1 extraction** server-side with fallback.
5. **AI 4.2 natural-language query** with fallback.
6. **§6 system/audit view.**
7. **AI 4.3 / 4.4** if time remains.

**Acceptance:** curated 12-month dataset persisted in Postgres for every persona · front-end generates nothing, queries the API · headlines and per-segment revenue reconcile to the model (tested) · extraction and query run via serverless functions, key server-side only and never client-exposed, invisible fallback with network off · natural-language query answers ≥3 seeded questions over the dataset · full core demo runs with the AI API disabled.

**Deferred to Phase 11:** all front-end configuration, design-system consolidation, performance/virtualization, motion, responsive/presentation modes, accessibility.
