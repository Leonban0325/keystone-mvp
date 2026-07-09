# KEYSTONE PITCH DECK — BUILD BRIEF v4 (FINAL, supersedes all prior deck briefs)

An 11-slide investor deck following Guy Kawasaki's framework (status/ask split into two
slides), built as a section of the landing page. Warm ivory canvas on EVERY slide (no dark
slide), display serif + grotesque sans, subtle motion per existing Phase 11 rules
(slow fade + small rise reveals only; deck fully legible with animations off).

## 0 · Single source of truth
`/src/data/deckData.ts` — every number, price, name, and figure in the deck is imported
from this file; no numeric literals inside slide components. (See the file for the full
canonical object: founders, persona, Eurostat CP041 market data with provenance, problem
quantification, verbatim value prop, revenue streams, pricing, 5-year forecast, KPIs,
landlord ROI, and the ask.)

## Global rules
- NO "HEC" or any startup-competition name. Keep the year.
- NO "six countries / six regimes" phrasing; regime specifics appear once (Slide 4 shows
  the engine as the moat) and in the appendix regime table.
- Zero occurrences of "letting agent".
- NO ">€1 trillion" claim. Market stat = Eurostat 2022 actual €176.8bn; projections
  ALWAYS labeled "projected"; never blend actual and projected.
- Yield is one benefit/revenue line among several — never the lead of any slide.
- Persona thread: Laurent on Slides 2, 9, 10.
- All slides fully legible as static frames; test at 1920×1080.

## The 11 slides
01 Title · 02 Problem (persona, cause → four quantified consequences, Eurostat hero stat
with provenance) · 03 Value proposition (verbatim, weighted 3-line treatment + subordinate
switch strip) · 04 Underlying magic (architecture + event-chain, ivory) · 05 Business model
(seven streams + pricing by client) · 06 Go-to-market (owner-yield markets first; channels
without letting agents) · 07 Competition (2×2, honest deficiencies, never "no competitors")
· 08 Team (four photo placeholders + bracketed credibility lines) · 09 Financials (5-year
forecast chart with negative-margin axis and "build & launch year" label, KPI strip,
"Laurent profits too" ≈5× cover) · 10 Current status (prototype status, bracketed traction
placeholder, QR to live prototype) · 11 The ask (€1.5M / 24 months, use-of-funds bar,
"what it buys", warm close).

## Appendix (after slide 11, Q&A only)
Eurostat CP041 actuals + scenario table with caveat · statutory regime table (as encoded)
· unit-economics decomposition and collar mechanics.

## Acceptance
- Every figure renders from deckData.ts; no content literals in slide components.
- No occurrence of: "HEC", competition names, "letting agent", "trillion",
  "six countries", "six regimes" (outside the appendix table), or any dark slide.
- Slide 2 hero is the 2022 Eurostat ACTUAL with provenance; projections labeled; all four
  consequences quantified; estimates labeled as estimates.
- Value prop verbatim with weighted 3-line treatment; switch strip subordinate.
- Financial chart renders negative margins without clipping; Y1 labeled "build & launch year".
- Team slide: four consistent photo placeholders.
- Slide 10: bracketed traction placeholder + QR to the prototype.
- Appendix: Eurostat scenario table + regime table.
- Deck reads cleanly with animations disabled at 1920×1080.

## Confirmed fixes (applied on top of the brief)
1. Laurent ROI, Option B: value €442 (169+160+113) vs fees €156 (SaaS Pro €144 + custody €12)
   → about 2.8x cover. Fees paid = SaaS + custody only (NIM share and savings fee come out of
   money he gains). All €486 / 5x references removed.
2. Germany fix: no "German deposit pool idle at 0%" claim (§551 BGB requires interest-bearing
   deposits with interest to the tenant). "Cash idle" consequence uses the France-anchored
   idleFraming line.
3. Ask lowered: €750k / 18 months; structure about 12% equity at roughly €6M post-money
   (CONFIRM with team) plus a board observer seat; buys 18 months runway, first 8 to 10,000
   units, seed/Series A proof points.
4. Competition slide replaced with four real tiers (deposit & escrow fintechs · landlord SaaS
   · traditional banks · pan-European deposit/wealth infra), companies named with what they DO
   only, no funding/valuation figures; moat line names Loi 89-462, the Dutch Good Landlord Act
   and Spain's regional LAU Art. 36 filings.
5. Appendix "The math": A business-model derivation at ECB 2.25%, B Laurent ROI math,
   C financials derivation (units × revenue/unit; Y5 balances), D Eurostat detail.
6. Punctuation: em/en dashes minimised in display copy; ranges as "to"; middot separators.
