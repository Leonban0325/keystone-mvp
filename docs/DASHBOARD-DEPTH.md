# KEYSTONE MVP — Addendum B: Dashboard Depth, Analytics & Navigation

> Companion to `KEYSTONE-MVP-BUILD-SPEC.md` and `CLIENT-PERSONAS.md`. Addresses demo feedback: dead space on dashboards, thin card/spend and savings views, per-apartment-only money tab, no search, no map. **Principle unchanged:** every widget is a *query/fold over the existing ledger* — new views, not new data sources. All charts use Recharts (already in stack). Build as **Phase 8**, after personas.

---

## 0. Fix first — number reconciliation (blocking)

The current B1 dashboard shows Total/unit €82.53 but Owner yield YTD €3,426.75 against €3.046M balances — these do not reconcile (60% × 2.25% × €3.046M ≈ €41k/yr owner yield, not €3.4k). **Every headline figure must fold from ledger events**, not from hard-coded per-unit constants inherited from the 10-unit landlord seed.

- Add a vitest assertion per persona: `dashboardTotals == sum(ledger projections)` within €1.
- Owner-yield-YTD = accrued `income`/`owner_payable` yield postings since Jan 1 of demo year, not an annualised guess.
- Revenue/unit decomposition must sum to the per-unit total shown; per-unit = portfolio revenue ÷ units.

---

## 1. Dashboard — role-specific widgets (kill the dead space)

The dashboard is a grid of widgets selected by role. Shared top row stays (NOI, Balances, Owner Yield, Savings). Fill the lower half per persona:

### owner (Segment A)
- **Next payout** — date + amount + waterfall preview
- **Rent due (next 30 days)** — expected vs at-risk
- **Effective software cost** — yield vs fees, the "negative cost" card
- **Compliance** — findings ring (as today)
- **Cash-flow mini-chart** — 6-month rent-in / spend-out

### property_manager (Segment B1) — "what do I act on today?"
- **Arrears aging strip** — €/count in 0–30 / 31–60 / 61–90 / 90+ buckets (the number PMs live by), click → filtered Money view
- **Owner payout run** — "38 of 42 owners distributed · 4 pending" progress, click → payout queue
- **Compliance by country** — horizontal bar FR/NL/ES with finding counts
- **Lease events calendar** — renewals, indexations, move-outs due (next 60 days)
- **Cash-flow timeline** — stacked monthly: rent-in, vendor-out, owner distributions, reserve moves
- **Portfolio NOI bridge** — opening → +rent −opex +savings → closing

### institution (B2 / B3)
- **Covenant tiles** — DSCR / LTV vs thresholds (amber when near), from extracted loan terms
- **Occupancy trend** + **lodgement completeness** (e.g. "178 / 180 fianzas certified")
- **Procurement badges** — EU residency · SSO · audit export (enterprise-trust row)

### partner (Segment C)
- **Activation funnel** — eligible → onboarded → active, with curve
- **Rev-share** — per-unit split partner/Keystone, running total
- **Webhook health** — simulated delivery success rate

*Implementation:* `dashboardWidgets(role)` returns an ordered widget list; each widget is a pure component fed by a ledger selector. No empty space at any breakpoint — grid reflows.

---

## 2. Portfolio analytics (the graphs)

Two hero charts, reused across roles:

1. **Cash-flow over time** — stacked area/bar by month: rent collected, vendor spend, owner distributions, reserve movements. Toggle portfolio / owner / property scope.
2. **NOI bridge** — waterfall: opening NOI → rent → −opex → +savings executed → closing. This visually ties the savings engine to asset value.

Add a compact **spark-row** on property/owner tables: 6-month rent trend sparkline per row.

---

## 3. Card & Spend — analytics-first, list-second

Replace the property-by-property list as the landing view with:

- **Spend by category** — donut (maintenance · utilities · insurance · fees · other)
- **Spend by property** — ranked bar, top 10 + "show all"
- **MoM trend** — total spend line, 12 months
- **Outlier flags** — "Property 214 · maintenance 3× its 12-mo average" (rule: > 2σ or > 2× trailing mean) — these **feed the savings engine** as vendor-renegotiation candidates
- **Card controls (PM-relevant):** per-property budget + burn %, pending-approval queue, receipts-missing count
- Transaction list becomes a **filterable drill-down** (by property, category, card, date), not the front door

---

## 4. Money tab — roll-up before drill-down

Add view levels above the per-lease journal; default level depends on role:

- **Portfolio** (all units, total flows) — default for property_manager / institution
- **By owner** (42 rows for B1 — the PM's core accounting unit) → owner subtotal → drill to that owner's properties
- **By property** → drill to leases
- **By lease** (current per-apartment journal) — the deepest level, default for `owner` role

Each level shows the same columns (in / out / net / balance) aggregated, with dimension filters. The journal remains the source; roll-ups are folds by dimension.

---

## 5. Savings Engine — show the system, all five detectors

Seed **all five detectors** from the functional spec, not two:

| Detector | Seeded example (B1 scale) | Logic trail shown |
|---|---|---|
| Property-tax review | 6 properties over-assessed, ~€2,280/yr | "taxe foncière €X vs €Y regional comparable → appeal basis" |
| Utility switching | 14 leases on non-optimal tariff, ~€2,940/yr | "tariff €X vs market €Y, same consumption band" |
| Vendor renegotiation | 3 contracts above benchmark, ~€1,850/yr | "€X vs anonymised benchmark €Y for same service/region" |
| Insurance repricing | 9 policies at renewal, ~€1,305/yr | "premium €X vs requote €Y" |
| Subsidy eligibility | 4 properties EPC-eligible, ~€16k one-off | "EPC class + work type → MaPrimeRénov'/Ecobonus rule match" |

Add an **engine-status panel** (the pitch centrepiece): "5 detectors running · 847 leases scanned · 36 opportunities · €41,200 identified · €0 executed." Each opportunity carries: expected €, confidence score, logic trail, execute button. Add **executed vs open** split and, for PMs, a **savings-by-owner leaderboard** (value captured per owner client — what the PM shows *their* clients). This converts "2 savings" into "an always-on optimisation engine."

---

## 6. Global search / command bar (Reports, Money, Properties)

A Cmd-K command bar resolving: tenant name · address · lease ID · owner name · property. Selecting a result deep-links to the relevant view (Reports → that tenant's quittance; Money → that lease/owner ledger; Properties → that property card). One index over seed data; used everywhere a scroll list currently exists. High demo impact — type "Laurent" → land instantly instead of scrolling 850 rows.

---

## 7. Properties & Leases — map + detail card

- **Map view** — Leaflet/MapLibre with free OSM tiles (or a dependency-free positioned-pin SVG if offline-safety preferred). One pin per property at seeded city coordinates, **colored by compliance status** (green/amber/red). Toggle map / list.
- **Property detail card** (on pin or row click): address, unit count, regime badge, occupancy %, deposit status, **next lease event**, current balances (deposit/reserve segregated), and quick-links to that property's Money roll-up and document store.
- The compliance-colored map doubles as a portfolio-at-a-glance visual for the enterprise pitch.

*Offline note:* if presenting without network, prefer the SVG-pin fallback so no tile server is needed on stage.

---

## 8. Build order & scope control

Add as **Phase 8**. Priority within it (if time-boxed):
1. **§0 reconciliation fix** — blocking, do first
2. **§1 PM dashboard widgets + §2 cash-flow chart** — kills the dead space, carries the demo
3. **§5 five-detector savings + engine panel** — the optimisation-engine pitch
4. **§4 money roll-up** + **§6 search** — the PM-usability fixes
5. **§3 spend analytics**, **§7 map** — polish, high visual payoff, do if time remains

**Acceptance additions:** dashboard reconciles to ledger (test) · no empty dashboard region at any persona/breakpoint · savings shows ≥5 seeded opportunities with logic trails · Money has a working portfolio/owner roll-up · Cmd-K resolves a tenant by name in the demo seed.
