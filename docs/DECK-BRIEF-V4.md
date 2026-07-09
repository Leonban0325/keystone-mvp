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
