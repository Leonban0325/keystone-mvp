# KEYSTONE MVP — Addendum D2: Data Realism (before Phase 11)

> Companion to Addendum D (Phase 10 curated dataset). The 12-month generator must produce data that reads as a real rental operation, not synthetic filler. Slot this **between Phase 10 and Phase 11** — the "live tomorrow" front-end will showcase this data, so obvious fakeness (round numbers, rent on the 1st every time, flat spend) would undercut the polish. **Principle:** realistic ≠ random. Model the actual behaviour of rental cash, then add controlled noise. Deterministic still (fixed seed → identical every run), but naturalistic.

---

## 1. The problem to fix

Current data looks generated: round rents, payments on a fixed day, uniform amounts, flat monthly spend, evenly-spaced dates, no seasonality, no life events. Redo the generator so every stream carries the texture a real portfolio has.

**Determinism preserved:** seeded PRNG (e.g. mulberry32), so the "randomness" is reproducible — the demo is identical every run and defensible, but *looks* organic. Never `Math.random()`.

---

## 2. Rent — the anchor stream

### 2.1 Amounts (not round)
- Base rent per unit drawn from a realistic per-city distribution, **not round**: e.g. Paris €1,140–1,890, Lyon €720–1,180, Amsterdam €1,290–2,050, Barcelona €780–1,340 — with cents/odd endings (€1,187, €943.50), not €1,200.
- Rent set at lease signing and **held flat until indexation** (see §6), not re-randomised monthly. Same tenant pays the same rent each month (± nothing) — realism is in the *timing and completeness*, not amount jitter month to month.
- Charges provision as a separate, smaller line (€60–180), also non-round.

### 2.2 Payment timing (this is where realism lives)
Rent is *due* on the lease's payment day (varies per lease: 1st, 3rd, 5th, 10th — set at signing, not all the 1st). Actual **settlement date scatters around due date**:
- ~70% land 0–2 days after due date (SDD settlement lag is normal)
- ~18% land same-day/early
- ~8% land 3–8 days late (the chronically-slightly-late tenant — consistent per lease, i.e. some tenants are *always* a bit late)
- ~4% become an R-transaction / arrears event (§4)
- Per-lease "punctuality personality" — a given tenant's lateness pattern is consistent across months, not re-rolled. This is what makes the data feel like real people.

### 2.3 Completeness
Not every unit is occupied every month. Seed a realistic **occupancy pattern**: 1–2 units per portfolio have a vacancy gap (30–90 days) somewhere in the 12 months, with no rent during the gap and a move-in/out event bracketing it. Vacancy is higher around summer months for student-adjacent units.

---

## 3. Vendor & operating spend — irregular and seasonal

Real property spend is lumpy, not a flat monthly line.

### 3.1 Recurring (predictable, but not identical)
- Insurance premium: annual or quarterly, a single larger hit (not smeared monthly).
- Heating/boiler service contract: monthly or quarterly, stable amount ± small variance.
- Cleaning/common-area: monthly, small variance.
- Property management or accounting fees where applicable.

### 3.2 Irregular (the lumpy reality)
- **Repairs & maintenance** arrive as **Poisson-distributed events** (random arrival, ~0.3–0.8 events/unit/year), with **log-normal amounts** (many small €80–300, occasional large €1,500–4,000 boiler/roof) — the long-tailed distribution real maintenance actually follows.
- Seasonal weighting: heating repairs cluster Oct–Feb; move-out turnover/cleaning/painting clusters around vacancy gaps and summer.
- One or two "capex" events in the year (a €3–8k renovation) so the spend chart has a genuine spike, not a flat band.

### 3.3 Utilities
- Where landlord-paid: monthly bills with **seasonal shape** (heating/electricity higher in winter), consumption-driven variance, and — deliberately — **1–2 anomalies** the savings detector catches (an estimated-read spike, a wrong-tariff overcharge). The outlier must exist in the data, not be hard-coded in the detector.

---

## 4. Arrears & payment failures — realistic, not uniform

- A few leases carry **realistic arrears arcs**, not a flat "2 months behind": e.g. paid fine for 7 months → missed → partial payment → caught up; or slid from on-time to 30 to 60 days over the year.
- R-transaction reasons vary (insufficient funds, mandate issue) and most **recover** within 1–2 cycles; a small number escalate through the dunning FSM.
- Benefit-paid leases (CAF/APL) show the split: state portion always on time, tenant portion with its own timing personality.

---

## 5. Card & category spending — natural distribution

- Card transactions are **event-driven, not evenly spaced** — clusters around maintenance activity, quiet stretches, occasional weekend gaps.
- **Amounts non-round**, merchant-appropriate: a hardware run €47.80, €212.35; a trades invoice €680; a utility top-up €94.20.
- **Category mix realistic per property**: maintenance-heavy older units vs low-spend newer ones; one property deliberately runs hot on maintenance (feeds the spend-outlier flag and a vendor-renegotiation savings opportunity).
- Merchant names country-appropriate and plausible (Leroy Merlin, Brico Dépôt, Bauhaus, local trades with real-sounding names), not "Vendor 1".
- Transaction **timestamps** carry time-of-day (business hours weighted), not just dates.

---

## 6. Time, seasonality & life events

- **Indexation applied mid-year** on the leases whose anniversary falls in-window — rent steps up once, on the correct date, per the IRL/CPI/ISTAT calc, so the rent series shows a realistic step rather than a flat line for 12 months.
- **Lease events distributed** across the year: 1–2 move-outs (deposit returned within the statutory clock, with itemised deductions), matching move-ins, one deposit dispute that resolves.
- **Compliance history** spread naturally: findings raised and remediated at various points (not all at t0), producing the "14 resolved, avg 2.3 days" track record with real timestamps.
- **Yield accrual** posted monthly at the **historical DFR path** (rates moved over the year), so owner-yield trend has real shape.
- Weekends/holidays: settlement avoids non-banking days (rolls to next business day) — a small touch that reads as real to anyone who looks.

---

## 7. Per-persona calibration (keep the story, add the texture)

Realism must not break the reconciliation to the model. Each persona's *aggregate* still lands on its target economics (Addendum: €177 / €249 / €203 / €124 / €264 per unit); the noise lives *within* the aggregate.

- **Small/mid landlord** — full texture as above at small N; individual tenant personalities very visible.
- **Property manager (850u)** — texture at scale; a few owners' portfolios run noticeably better/worse (some owners have the late tenants, the maintenance-heavy stock) so the owner roll-up has real spread.
- **Housing association** — social-mode arrears (longer arcs, payment plans), benefit flows dominant, lower per-unit spend variance, pooled treasury.
- **Institutional BTR** — more uniform, professionally-managed feel (tighter payment timing, scheduled maintenance), but with the one covenant-relevant month and the fianza-lodgement gaps.

**Blocking:** after generation, assert each persona's annualised aggregates still fold to its model figures within tolerance (±1–2%). Realism adds noise around the mean; it must not move the mean.

---

## 8. Implementation notes

- One seeded PRNG threaded through the whole generator; expose the seed so a specific "good-looking" run can be locked for the demo.
- Distributions to implement: normal (timing jitter), Poisson (repair arrivals), log-normal (repair/spend amounts), Bernoulli (late/vacancy flags), plus per-entity fixed "personality" parameters drawn once per lease/tenant/property and reused all year.
- Generate to the Phase-10 Postgres tables; `npm run seed` remains idempotent and reproducible.
- Add a `verify-realism` script: prints per-persona summary stats (rent-timing histogram, spend-by-month, maintenance event count, arrears arcs, aggregate reconciliation) so the team can eyeball that it looks natural AND still reconciles before locking the seed.

---

## 9. Acceptance

- No round-number rents; payment days vary per lease; settlement dates scatter naturally around due dates with consistent per-tenant punctuality.
- Vendor/maintenance spend is lumpy and seasonal (Poisson arrivals, log-normal amounts, winter heating cluster, ≥1 capex spike); at least one genuine utility/spend anomaly exists in the data for the detector to find.
- Card transactions event-clustered, non-round, country-appropriate merchants, with time-of-day.
- Arrears show realistic arcs (recovery, gradual slide), not uniform "N months behind".
- Rent series shows a mid-year indexation step; vacancy gaps and lease events distributed across the 12 months; compliance findings timestamped across the year.
- **Every persona's annualised aggregates still reconcile to the model figures (±1–2%)** — tested.
- Deterministic: same seed → identical dataset every run.
- A `verify-realism` report exists and shows natural-looking distributions.

**Build before Phase 11.** The front-end polish should render believable data, not expose synthetic filler.
