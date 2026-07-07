# KEYSTONE MVP — Addendum E: Phase 11 — Front-end, Money Rails & Production Feel

> Companion to Addenda A–D. Phase 11 makes Keystone look and behave as if it could go live tomorrow: a dedicated **money-rails visualization** reached from the Money tab, production-grade interface states, and a rigorous design-system pass. Back-end (Phase 10) is assumed done. **Principle unchanged:** simulated rails, honestly badged; nothing implies a real integration that does not exist.

---

## 0. Partner naming — credibility without false claims (READ FIRST)

The demo must look institution-grade without stating a partnership that does not exist. Rules for Claude Code:

- **Partner bank = a single configurable field** (`PARTNER_BANK` in config), **defaulting to a fictional-but-institutional name**: `"Aval Bank AG"` with descriptor `"BaFin-regulated · Deposit Guarantee Scheme member"`. Styled with full seriousness (a clean wordmark, not a joke placeholder).
- **Real rail providers named by category, truthfully:** "escrow-as-a-service infrastructure (e.g. Mangopay, Lemonway)", "EU card issuer-processor" — naming the *type* of provider is accurate and shows homework. Never imply a signed relationship.
- **Real bank names appear in exactly one place:** a "Target launch partners" line (ambition, true) — e.g. "Target: tier-one BaFin-regulated institutions." Not in the live flow, not as a connected logo.
- Because the name is a config field, the team can set it to anything before presenting — but the committed default is the fictional bank, and that is the recommended demo posture. Every rails view reads `PARTNER_BANK` from config; no hard-coded bank name anywhere.
- A subtle, always-present **"Simulated rails"** badge on any screen depicting money movement (hidden only in `?demo=clean` for slides, never claimed as live).

---

## 1. Money-rails visualization (the headline feature)

### 1.1 Entry point
On the **Money tab**, each transaction row (and a portfolio-level "View money rails" affordance) has a click target that navigates to the **dedicated Money Rails screen**, pre-focused on that transaction or flow. The Money tab itself stays clean (roll-up ledger from Addendum B); the rails screen is the "here's how it actually works" moment.

### 1.2 What the screen shows — the correct systematic process
A horizontal architecture diagram of the real tripartite structure, with money-flow animation. Layers, left to right:

```
  TENANT ──▶ [ Virtual IBAN ]──▶ [ EMI / escrow layer ]──▶ [ PARTNER BANK ]
             per-lease            "the movement"            segregated,
             inbound              (Mangopay/Lemonway         DGS-protected
                                   class, simulated)         "the vault"
                          ▲
                   [ KEYSTONE ] ── orchestrates, never holds
                   drawn BESIDE the flow, with a dashed
                   "control, not custody" link — funds never
                   pass through Keystone's own balance sheet
```

- **Keystone sits beside, not in, the flow** — the single most important visual. A dashed "orchestration" line touches each stage; a bracket annotation states "funds never enter Keystone's balance sheet." This dramatizes the capital-light thesis.
- **Segregation shown explicitly:** the partner-bank vault visually ring-fences deposit vs reserve pools, with the DGS-protection badge attached and the "insolvency-remote" property labeled.

### 1.3 Two-phase settlement animation (technically accurate)
When a transaction is selected (or "simulate a rent collection" is pressed), animate the real state machine — matching the Phase-9/10 ledger protocol, not a cartoon:

```
Rent collection:
  MandateActive → PreNotified → Submitted → [rail: settling…] → Settled
    → Ledger: intent posting → settlement posting → Reconciled ✓
Deposit custody:
  Received → Screened(AML) → Segregated@PartnerBank → DGS-confirmed
Payout:
  Scheduled → ReserveTopUp → VendorNetted → OwnerDistributed
```

Each step shows: a timestamp, a correlation/reference ID, the state name, and which system owns the step (EMI / bank / Keystone-orchestration). The **ledger's intent→settlement two-phase posting** is shown alongside so a judge sees the double-entry happen as the rail confirms. A failure path is demoable (force an R-transaction → compensating entry → retry) to prove it is a real state machine, not a happy-path mock.

### 1.4 Connection-status panel
A "connections" strip: Partner Bank · EMI/escrow · Card issuer · KYC provider — each shown "Connected" with a green indicator, a last-heartbeat timestamp, and the **"Simulated"** honesty tag. Looks exactly like a real integrations page; claims nothing false.

---

## 2. Production-grade interface states

The gap between demo and product is the states most demos skip. Every view must handle:

- **Loading** — content-shaped skeletons (not spinners); data streams in progressively.
- **Empty** — deliberate, guiding empty states (a persona with no arrears, a detector mid-scan, a filtered list with no results) — never a blank panel that reads as a bug.
- **Error** — defined error states with a recovery action; an error boundary per major view so one component never white-screens the demo.
- **Optimistic + confirm** — money actions update immediately, then confirm on (simulated) settlement; a toast marks completion.
- **Confirmation dialogs** — before any money movement or remediation (the four-eyes principle made visible).

---

## 3. Micro-interactions & real-time feedback

The event-sourcing story is only felt if cause and effect are visible:

- The ledger row that **just posted** highlights briefly; numbers **animate** when they change (count-up on load, delta flash on update).
- The **compliance ring redraws** when a finding resolves; the FR **penalty ticker** counts in real time.
- Hover states, focus rings, pressed states on every interactive element.
- Persona switch is a **clean, near-instant transition** (no stale-data flash), resetting scroll and view-level.
- Purposeful motion only — every animation explains a state change; nothing decorative.

---

## 4. Notifications & "needs attention" layer

Real financial software opens to "what changed and what needs you":

- A **notification center** (bell): findings raised, clocks crossing thresholds, arrears escalations, payouts completed, savings realized.
- An **action-required queue** on the dashboard: the 2–4 things this persona must act on today, each a deep-link.
- Threshold alerts driven by the demo clock (advance the clock → a return-clock alert fires visibly).

This is the strongest "the system is running, not just being viewed" signal.

---

## 5. Trust & compliance surface (fintech-specific, persona-weighted)

- Extend the **SEGREGATED** badge into a fuller trust layer: DGS-protection badge with a tooltip explaining coverage, audit-trail visibility, "last synced" indicators.
- **Enterprise/association procurement cues** (B2/B3 personas): EU data-residency badge, SOC 2 "in progress", SSO indicator, audit-export button — the enterprise-readiness claim shown as UI.
- Security posture cues: session activity, a visible immutable-audit link (ties to "the audit trail is the architecture").

---

## 6. Design-system consolidation (the finishing coat)

Least glamorous, highest impact — this is what turns "several screens that work" into "one product":

- **Tokens** — ink `#122A3E` · paper `#F6F2E9` · brass `#B98A2F` · grey `#6E7680` as CSS variables; one spacing scale; one type scale.
- **Component library** — a single `Card`, `Table`, `Stat`, `Badge`, `ChartFrame`, `Dialog`, `Toast`, `EmptyState`; every screen composes these, none re-styles ad hoc.
- **One number-formatting utility** applied everywhere (decimals, separators, unit labels, tabular numerals) — kills the €82.53 / €3,046,000 / €352.70/yr inconsistency.
- **Visual hierarchy rule** — one hero figure per screen in brass + larger type; supporting figures recede.
- **Editorial-financial aesthetic** (matches the deck): hairline rules, generous whitespace, direct labeling on charts, no gradients/glassmorphism/pill-badges/purple-teal SaaS look.

---

## 7. Configuration, responsiveness & presentation modes

- **Presentation resolution** — test and lock layout at the actual projector/laptop resolution; verify no view breaks at 1080p.
- **`?demo=clean`** — hides all dev chrome, simulated-rails badges softened to a single subtle mark, ready for slides/screenshots.
- **Kiosk / full-screen** mode; optional keyboard-driven demo flow so the pitch advances without hunting for click targets.
- **Accessibility pass** — keyboard nav, focus states, WCAG-AA contrast (also reinforces the B2 housing-association procurement claim, which genuinely requires it).

---

## 8. Build order & scope

1. **§6 design-system consolidation** — do first; everything else inherits it (and it retro-fixes formatting/hierarchy debt).
2. **§1 money-rails screen + two-phase animation** — the headline; the feature you specifically want.
3. **§2 interface states** — what makes it read as finished.
4. **§3 micro-interactions** — what sells event-sourcing.
5. **§4 notifications** + **§5 trust surface** — the "it's running" and "it's fintech-grade" signals.
6. **§7 presentation modes + accessibility** — last, tuned to the actual venue.

**Acceptance:** partner bank is a config field defaulting to the fictional institution, no real bank name in any live flow · Money tab click-through opens the dedicated rails screen focused on the chosen flow · two-phase settlement animates with real states, IDs, timestamps, and the parallel ledger postings, incl. a demoable failure path · every view has loading/empty/error states · number formatting consistent app-wide via one utility · persona switch is clean with no stale flash · `?demo=clean` hides dev chrome · runs at presentation resolution without layout breaks.

---

## Note on scope
Phase 11 is the "live tomorrow" pass. The win condition: a judge navigating the app on their own cannot tell, from feel, that it is a demo — until they read the honest "Simulated rails" badge that says so. Polish and honesty at once.
