# KEYSTONE MVP — Addendum G: Phase 13 — Prototype Realism & Access Correctness

> Companion to Addenda A–F. Phase 13 shifts Keystone from "a demo that announces it is a demo" to a **functioning prototype that behaves like the real product**. Simulated-boundary labels are removed from the interface; the simulated boundary is disclosed only through one quiet, honest path. Real logic stays real; only the "this is fake" scaffolding goes. **Principle:** look and behave real; be transparent when asked, not by stamping every screen.

---

## 1. Remove the "it's a demo" scaffolding

- **Remove the "Simulated rails" badge** everywhere it appears.
- **Remove the "KYC verified" top badge** in its current form — it returns only as an *earned* state after the real KYC/KYB flow (§5), never as a pre-set label.
- **Remove the demo-date / clock control.** The curated dataset already represents "today, with 12 months of history behind it." Stepping time forward no longer fits a prototype that presents a current state. All views render the present with historical depth; no time-advance control.
- **Erase all business-owner / founder notes** seeded on screens (the "for the founder" annotations, the pitch-explainer captions). The interface speaks to its user (landlord / manager / institution), not to the presenter.
- **Reframe throughout as a prototype**, not a demo: no copy anywhere that says "demo", "simulated", "example", or "mock" in the user-facing UI.

### The single honest disclosure path (keep this one)
One unobtrusive **"About this prototype"** item — in a settings/about corner, footer, or account menu, not on any working screen — stating plainly that this is a functioning prototype: the compliance, ledger and application logic are real; banking, payment, card and identity **rails are represented, not connected to live third-party services**. This protects integrity if a judge asks "is this wired to a real bank?" — the honest answer was always one click away. Do not surface it on working screens; do not remove it entirely.

---

## 2. Property list — regional grouping + inline detail

For all-France portfolios (e.g. Gestion Haussmann, all FR), and as the general pattern:

- **Group properties by region** (Île-de-France, Auvergne-Rhône-Alpes, PACA, etc. for FR; by country/region for mixed portfolios). Collapsible region headers with a per-region summary line (unit count, occupancy, balances, open findings).
- **Property detail expands inline, directly below its own row/box** — an accordion/expander — NOT at the bottom of the page. A manager with hundreds of units clicks a property and sees its detail in place, without scrolling to a detached panel.
- Detail card contents (inline): address, units, regime badge, occupancy, deposit status, current balances, next lease event, quick-links to that property's ledger and documents.
- List remains virtualized (performance) so regional grouping over hundreds of units stays fast.

---

## 3. Occupancy trend — realistic and 12-month

- The current flat "397/400" is impossible — occupancy must **fluctuate**: move-ins and move-outs across the year produce a line that rises and falls within a realistic band (e.g. 94–99% for a well-run portfolio), driven by the actual lease events already in the curated dataset (§ data realism addendum). Occupancy is computed from real move-in/out events, not a static number.
- **12-month window**, not Jan–Jun. The trend chart spans the full trailing year, matching the dataset's historical depth.
- Show the current occupancy as a point on that trend, with the trailing-12-month shape behind it.

---

## 4. Report printing — scoped to the report

- The print action on a generated report (quittance, deposit-return statement, régularisation, lender pack) must **print only that report artifact**, not the whole application page.
- Implement via a print-scoped view (a dedicated print route/component, or a print stylesheet that hides all app chrome and shows only the report). The output is the clean document a landlord would file — no nav, no dashboard, no browser UI.

---

## 5. Real KYC / KYB structure (earned verification)

Replace the asserted "KYC verified" badge with a **genuine verification flow that runs on curated data** — the process is real (multi-step, stateful, gated); only the third-party provider call is represented rather than live. This is consistent with the whole architecture: real logic, represented rails.

### 5.1 The flow
- **KYC (individuals — landlords, tenants):** identity document capture → liveness/verification step → sanctions & PEP screen → status: verified / review / rejected.
- **KYB (businesses — SARLs, SCIs, associations, SOCIMIs):** company registration lookup (SIREN/SIRET-style) → **UBO / beneficial-owner resolution** (who ultimately owns the entity) → each UBO through KYC → company sanctions screen → status.
- Each step is a real state with real gating: a party cannot reach "verified" without passing every prior step in-session. The verification **badge appears only after the flow completes** — earned, not preset.
- Store verification status against the entity/person in the ledger's party records; surface it where it matters (onboarding, a party's profile), not as a permanent top-bar decoration.

### 5.2 What's real vs represented
- Real: the flow, the steps, the gating, the states, the UBO structure for a SARL/SCI, the record kept.
- Represented: the actual call to an identity provider (returns a deterministic result from curated data). No real document is verified.
- Ties to the AML orchestration already specced: verified parties feed the partner-institution compliance view.

---

## 6. Access correctness — clients never see Keystone's economics

- **Remove Keystone's revenue-per-unit (and any Keystone-take figure) from all client-facing views.** A landlord/manager/institution sees THEIR numbers: owner yield earned, savings captured, fees they pay, balances, NOI. They never see Keystone's NIM share, blended revenue/unit, margin, or the €172/€225 figures.
- Those figures are **owner-of-the-business economics** — they belong only in an internal/admin view (or simply not in the client product at all for the prototype). If an internal economics view is wanted, gate it behind an explicit internal/admin role that no client persona can reach.
- Audit every screen for leakage: dashboards, reports, exports must show client-side economics only. The "revenue per unit" decomposition that currently appears client-side must be removed or replaced with the client's own value summary (yield + savings vs fees paid).

---

## 7. Payment rails — out of the nav, into a contextual process view

- **Remove "Payment Rails" from the left navigation.** It is not a place a real user visits; the rails are infrastructure, not a feature page.
- Replace with a **contextual process view**: from a transaction (or a "view processing" affordance on a payment), open a focused view showing the **actual sequence a real payment rail runs** — the state machine (mandate → pre-notify → submit → settle → reconcile), the two-phase ledger posting, the parties involved, timestamps and reference IDs. Presented as the real processing detail of that specific transaction.
- **Do not over-explain.** No architectural lecture, no "here's how our system works" framing, no "simulated" labels. It shows the process of *that payment*, the way a real operations tool would surface transaction processing detail. Concise, factual, real-looking.
- The tenant→escrow→bank→owner architecture understanding still exists for the pitch, but it lives in the pitch deck / documents, not as a nav item in the product.

---

## 8. General realism sweep

- Remove any remaining copy that breaks the fourth wall (tooltips, empty states, headers referencing "demo", "sample", "test").
- Every persona's data reads as a real operating portfolio (this depends on the Data Realism addendum being done — natural amounts, dates, fluctuations).
- Connection/status indicators, if kept, show plain operational states ("Active", last-updated timestamps) without the "simulated" qualifier — truthful as UI states, with the honest boundary disclosed only via §1's About path.
- The product should withstand a judge clicking freely and never encountering a "this is a demo" seam — while the About path ensures the team is never misleading if asked directly.

---

## 9. Build order & acceptance

1. **Remove scaffolding** (§1) — badges, clock, founder notes; add the single About-prototype disclosure.
2. **Access correctness** (§6) — strip Keystone economics from client views (integrity + correctness; do early).
3. **Property regional grouping + inline detail** (§2).
4. **Occupancy realism + 12-month trend** (§3).
5. **Report-scoped printing** (§4).
6. **KYC/KYB flow** (§5).
7. **Payment-rails → contextual process view; remove from nav** (§7).
8. **Realism sweep** (§8).

**Acceptance:**
- No "Simulated rails", "KYC verified" (as preset), demo-date control, or founder notes anywhere in the UI.
- One "About this prototype" disclosure exists, off the working screens, stating what is real vs represented.
- Properties group by region; clicking one expands its detail inline directly below it, not at page bottom.
- Occupancy fluctuates over a real 12-month window, computed from lease events.
- Printing a report outputs only that report, no app chrome.
- A real, gated KYC/KYB flow exists (incl. UBO for entities); the verified state is only reachable by completing it.
- No client-facing screen, report, or export shows Keystone's revenue/unit, take, or margin.
- Payment Rails is not in the nav; transaction processing detail is reachable contextually and shows the real rail sequence without "simulated" labels or over-explanation.
- A judge can click through the whole product without hitting a "this is a demo" seam.

---

## Note
Phase 13 is the integrity-and-realism pass: the prototype should feel like the shipping product, show clients only what clients should see, earn every claim it makes (verification), and disclose its simulated boundary honestly but quietly. Real where it counts, represented where it must be, transparent when asked.
