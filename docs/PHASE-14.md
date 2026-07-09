# KEYSTONE MVP — Addendum H: Phase 14 — Confidence Removal, Clock Cleanup & Metric Realism Audit

> Companion to Addendum G (Phase 13). Three targeted fixes: remove the savings-engine confidence score, clean up everything the removed demo-clock used to drive, and audit every headline metric across every persona for static or impossible values. Small, surgical, integrity-focused.

---

## 1. Delete the savings-engine confidence score

Remove the confidence score entirely rather than ship a number that cannot be defended.

- Remove the confidence field/badge from every savings **opportunity** — the queue, the detail view, any dashboard summary, and any export.
- Remove it from the savings data model / API response so nothing downstream still reads it.
- Remove any sorting, filtering, or ranking that used confidence. **Re-rank opportunities by expected € value** instead (largest saving first) — a simple, defensible ordering.
- Keep everything else about each opportunity: the expected € value, the logic/reason trail ("taxe foncière €X vs €Y regional comparable"), and the execution workflow. The opportunity is still fully explainable — it just no longer carries a probability number.
- Sweep for orphaned references: no "confidence", "% likely", or similar copy left in tooltips, empty states, or the engine-status panel. The status panel line becomes e.g. "5 detectors · 847 leases scanned · 36 opportunities · €41,200 identified" with no confidence aggregate.

**Acceptance:** no confidence value anywhere in UI, data model, or exports; opportunities ranked by expected value; the reason trail remains.

---

## 2. Clock-dependency cleanup (after removing the demo clock)

Removing the demo-date control (Phase 13 §1) leaves behind logic and UI that were designed to be *driven* by advancing time. Those states must still be correct as a **static current snapshot** — the prototype shows "today" with 12 months of history, so every time-based state is computed relative to a fixed "now", not to a movable clock.

### 2.1 Recompute time-based states against a fixed "now"
Anchor a single `NOW` = the end of the curated 12-month dataset (the dataset's present). Every time-derived value is computed relative to `NOW`, once, statically:
- **Return clocks** — a deposit "due back in 10 days" is 10 days from `NOW`, shown as a static countdown/date, not something that ticks or advances.
- **Arrears aging** — 0–30 / 31–60 / 61–90 buckets computed as of `NOW` from the payment history.
- **Indexation windows** — "opens in X days" or "open now" relative to `NOW`.
- **Lease events** — "move-out in 10 days", renewals due — all relative to `NOW`.
- **Penalty exposure** (FR 10%/mo) — computed for any currently-late return as of `NOW`, static.

### 2.2 Remove clock-dependent affordances
- Delete any "advance time", "+1 day", "+1 month", "jump to event" controls and any copy that says "advance the clock to see…".
- Remove any UI that only made sense while stepping time (e.g. a live-ticking penalty counter becomes a static "€X exposure, N days late").
- Anything that animated or updated *because the clock moved* now renders its final/current state directly.

### 2.3 Sweep
Grep the codebase for clock references (`demoDate`, `advanceClock`, `+1 day`, `clock`, `stepTime`, etc.) and confirm each is either removed or repointed to the fixed `NOW`. No dangling control, no dead handler, no "time travel" seam.

**Acceptance:** no time-advance control or copy anywhere; every time-based value (clocks, arrears aging, indexation, penalties, lease events) displays correctly as a static snapshot relative to a fixed `NOW`; no dead clock handlers remain.

---

## 3. Static / impossible-metric audit (widen the occupancy fix)

The flat "397/400" occupancy was one instance of a general problem: metrics that should vary are static or unnaturally smooth, especially on the larger enterprise personas. Fix the class, not just the one case.

### 3.1 Audit every headline metric, every persona
For each persona (small LL, mid LL, property manager, housing association, institutional BTR, partners), check every dashboard/summary figure and its trend for:
- **Impossible constancy** (a ratio that never moves across 12 months).
- **Unnatural smoothness** (a perfectly straight trend line).
- **Values that don't reconcile** to the underlying ledger events.

Metrics to check explicitly:
- **Occupancy** — fluctuates in a realistic band (e.g. 94–99%), computed from move-in/out events, 12-month trend (already in Phase 13 §3; confirm done).
- **Arrears** — varies month to month; realistic aging distribution, not a flat "N behind".
- **NOI** — moves with the lumpy, seasonal spend and rent (per Data Realism addendum); a real bridge, not a flat band.
- **Owner yield YTD** — a running sum over the historical rate path; a rising, slightly uneven line, not a straight ramp.
- **Savings captured** — steps up as prior-month opportunities were executed; not zero, not flat.
- **Spend by category / month** — lumpy and seasonal, not uniform.
- **Balances** — drift with deposits taken/returned and reserve movements, not a constant.

### 3.2 Compute from events, not constants
Every headline metric must be a **fold over the curated event history**, not a stored scalar. If any figure is currently a hard-coded number, replace it with a computation over the ledger/lease events (which already carry the natural fluctuation from the Data Realism addendum). This is also the fix that makes the numbers reconcile.

### 3.3 Reconciliation still holds
After making metrics dynamic, the persona aggregates must still fold to the model figures (per-segment revenue/unit, etc.) within tolerance — realism adds fluctuation around the mean without moving the mean. Assert in tests.

**Acceptance:** no headline metric on any persona is static or perfectly smooth where real data would fluctuate; every figure computes from event history; trends span 12 months; per-persona aggregates still reconcile to the model (tested).

---

## 4. Build order

1. **§1 confidence deletion** — smallest, self-contained.
2. **§2 clock cleanup** — must follow Phase 13's clock removal; repoint everything to a fixed `NOW`.
3. **§3 metric audit** — depends on the Data Realism dataset providing the underlying fluctuation; compute all headline metrics from events.

**Overall acceptance:** confidence score gone and opportunities ranked by value; no clock control or dangling time-travel logic, all time-based states correct against a fixed NOW; every persona's headline metrics fluctuate naturally, compute from events, span 12 months, and still reconcile to the model.

---

## Note
Phase 14 is a correctness-and-realism cleanup: remove the number you can't defend, make time render as a truthful static snapshot, and ensure no metric betrays the prototype by sitting impossibly still. (Landing-page pitch-deck integration is deferred to a later phase, per plan.)
