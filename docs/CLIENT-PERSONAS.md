# KEYSTONE MVP — Addendum A: Client Personas & Segment Demos

> Companion to `KEYSTONE-MVP-BUILD-SPEC.md`. Adds a **persona switcher** (demo panel + login-style picker on first load) with seven seeded client examples across the three segments. Each persona = its own seed dataset, role, visible screens, and pricing tier. Switching personas swaps the seed and the RBAC role; the engine code never changes — that IS the demo point ("same ledger, same rules, different surface").

---

## Segment A — Small-to-mid landlords
*Run the portfolio through the Keystone account: rent, deposits, reserves, statutory compliance in one place. Role: `owner`. Pricing: Basic €7 / Pro €12 per unit/mo.*

### A1 · "Meridian Properties SCI" — the canonical demo (default persona)
- **Who:** M. Laurent, 58, owns via a French SCI. **10 units**: 6 FR (Paris 11e, Lyon), 2 NL (Amsterdam), 2 ES (Barcelona). Self-manages with a part-time accountant.
- **Balances:** €125,000 (€25k deposits / €100k reserves) — reconciles exactly to the deck's €172/unit.
- **Seeded stories:** FR deposit €200 over cap (one-click refund) · ES lease missing lodgement certificate · NL move-out clock at T−10 days · one arrears case in dunning · indexation window opening next demo-month.
- **Tier:** Pro. **Shows:** the whole core loop — compliance queue, journal, savings engine, reports.

### A2 · "Sofia Jansen" — the solo starter
- **Who:** 34, Rotterdam engineer, **3 units** NL: two singles + one 3-tenant flat-share. No accountant, no software today (bank app + spreadsheet).
- **Balances:** €21,500 (€6.5k deposits / €15k reserves). **Tier:** Basic €7.
- **Seeded stories:** flat-share split payments (one co-tenant pays late, others on time — dunning targets only the late payer) · quittance auto-generation · her *effective software cost is negative* card on the dashboard (yield €290 vs fees €252/yr).
- **Demo point:** the bottom of the market still clears the value bar — and colocation handling is native, which no bank offers.

### A3 · "Falkenrath Grundbesitz GbR" — the expansion-market teaser (read-only)
- **Who:** Munich family partnership, **22 units** DE. Shown as a **"coming market" preview**: leases visible, DE ruleset evaluating (3× Kaltmiete cap, three-instalment right, tenant-interest accrual posting to `liabilities:tenant_interest_accrued`), but money screens watermarked "Germany — expansion tranche".
- **Demo point:** the engine already speaks §551 BGB; only the rails are pending. Tenant-interest accrual visibly computed — proof the tenant-yield regimes are engineered, not hand-waved.

---

## Segment B — Enterprise clients
*Property managers, letting agents, housing associations, institutional BTR. Roles: `property_manager` or `institution`. Pricing: Enterprise ~€5/unit/mo volume. New UI surface: the **owner-of-owners roll-up**.*

### B1 · "Gestion Haussmann SARL" — administrateur de biens (FR)
- **Who:** Paris property-management firm, 11 staff, manages **850 units for 42 owner clients** (SCIs and individuals).
- **Role & surface:** `property_manager` — a roll-up dashboard BY OWNER CLIENT (42 rows: units, balances, compliance status, NOI), drill-down into any owner's portfolio, bulk rent-roll CSV import wizard (seed a 40-row CSV in `/fixtures`), per-owner report pack generation, team seats with per-owner access scopes.
- **Seeded stories:** 3 of 42 owners have open findings (roll-up shows red dots → drill in) · one owner onboarding mid-flight via CSV import · manager-fee flow visible in the waterfall (manager's 7% fee deducted before owner distribution — the ledger handles three parties, not two).
- **Demo point:** one contract, 850 units. CAC collapses. The manager becomes the channel *and* the customer.

### B2 · "Stichting Wonen Rijnland" — housing association (NL woningcorporatie)
- **Who:** social-housing association, **12,000 units** (demo loads a 400-unit sampled slice, labelled as such), Leiden region.
- **Role & surface:** `institution` — huurtoeslag (housing-benefit) flows shown pre-reconciled on tenant ledgers; arrears policy in social mode (longer grace, payment plans before fees); procurement badges visible (EU data residency, SSO stub, audit-export); white-label theme toggle (their green/white brand skin over the same app — one click in the demo panel).
- **Economics honesty:** reserves/unit seeded at **€3,000** (associations pool treasury centrally) — the dashboard shows the model still standing at lower float: durable fees + savings engine carry it.
- **Demo point:** the enterprise procurement story (residency, SSO, audit) and the white-label switch.

### B3 · "Ibervia Living SOCIMI" — institutional build-to-rent (ES)
- **Who:** Madrid-listed SOCIMI, **2,400 BTR units** across 6 assets (demo loads one 180-unit asset), CFO persona.
- **Role & surface:** `institution` — the **refinancing-readiness pack** is the hero: DSCR/LTV tiles against covenant thresholds extracted from a seeded loan agreement (one covenant amber), one-click lender pack (PDF-style HTML: income statement, rent roll, arrears, occupancy, EPC); fianza lodgement at scale (180 certificates tracked, 2 missing seeded).
- **Demo point:** Europe's 2026–28 refi wall — "pristine financials on demand" is why an institution adopts before yield even enters the conversation.

---

## Segment C — Partnership-driven distribution
*Not end clients — channels whose one contract onboards thousands of units. Role: `partner`. New UI surface: the **Partner Console**.*

### C1 · "Rentora Software" — PMS integration partner
- **Who:** fictional mid-size European property-management software (a Rentio/Odoo-property-class product), 60,000 units on their platform, embedding Keystone as their financial layer.
- **Surface:** Partner Console — API keys (fake), webhook delivery log (simulated events streaming), embedded-flow preview (Keystone screens inside a "Rentora" chrome), rev-share dashboard (per-unit economics split partner/Keystone), onboarding funnel: 60,000 eligible → 4,200 activated → activation curve chart.
- **Demo point:** B2B2B2C — the software their landlords already use becomes the distribution rail. Mirrors the Goldbridge 8M-unit partnership mechanic.

### C2 · "Agence Réseau Hexagone" — letting-agent franchise network (FR)
- **Who:** 120-branch agency network, **15,000 managed units**. Co-branded (not white-label) rollout: branch-by-branch activation map of France, branch leaderboard, network-level compliance heat map, affinity pricing (network negotiates €6/unit for members).
- **Seeded story:** 34 of 120 branches live; one branch mid-onboarding with its rent-roll import at 60%.
- **Demo point:** the franchise HQ sells it *for* Keystone — every branch is a mini-B1.

### C3 · "Partner Bank SME Channel" — the bank as distributor
- **Who:** the collar-partner bank's SME banking arm refers landlord business customers; referral tracked, bank keeps its collar share + referral visibility.
- **Surface:** minimal — a referral-funnel card inside the Partner Console (referred → onboarded → balances landed) and a note tile: "bank-side floor: 12 bps · current share: 29.25 bps" tying back to the collar.
- **Demo point:** the bank is not just infrastructure; its channel is paid by the same deal that rents us the balance sheet. Every party in the tripartite structure distributes.

---

## Implementation notes for Claude Code

1. **`/src/engine/seed/personas/`** — one seed module per persona (A1 default). Persona = `{id, segment, role, entities[], properties[], leases[], storyStates[], pricingTier, themeOverride?}`. All generated with the fixed-seed RNG; A1 numbers must keep reconciling to €172/unit.
2. **Persona switcher:** first-load picker styled as a login screen ("Sign in as…" with the 7 personas grouped by segment — itself a nice pitch visual), plus quick-switch in the demo panel. Switching = reset journal → load persona seed → set role → apply theme.
3. **RBAC in UI only** (no auth): `owner` sees core screens; `property_manager` adds the owner roll-up + CSV import; `institution` adds refi pack / procurement badges; `partner` sees Partner Console instead of money screens.
4. **New components:** OwnerRollupTable, RentRollImportWizard (parses the fixture CSV, previews, commits as ledger onboarding events), LenderPack view, PartnerConsole (keys, webhook log simulator, funnel chart), WhiteLabelTheme (CSS-var swap), BranchMap (simple SVG France with dots — no map library).
5. **Build order:** add as **Phase 7** after the core spec's six phases. A1–A2 come free from the existing seed; B1 and C1 are the two highest-value additions if time is short — they carry the enterprise and partnership slides respectively.
6. **Demo script extension (90 extra seconds):** "…and this is the same engine wearing three different faces" → switch A1 → B1 roll-up (one contract, 850 units) → B3 lender pack (the refi wall) → C1 partner funnel (60,000 units behind one integration). End: "one ledger, one rules engine, three go-to-market motions."

## Consistency rules
- Unit economics identical across personas except tier pricing and B2's reserves/unit — differences must be *explained on screen*, never silent.
- Enterprise volume tier €5/unit and network affinity €6/unit match the tiered SaaS ladder in the business model (§7).
- Nothing in a persona may contradict the deck: if the deck says woningcorporaties ≈2.3M units nationally, the persona card may cite it; invented client names must be clearly fictional (avoid real company names).
