# KEYSTONE MVP — Addendum J: Phase 16 — Design-System Enforcement & UI Craft

> Companion to Addenda A–I. Phase 16 is the pass that makes the whole product read as if the best design engineer built it. The root cause of the current rough edges (misaligned sign-in rows, the broken SEGREGATED badge, the disfigured Europe map) is the same: no *enforced* design system, so each screen was laid out independently and small inconsistencies accumulate into an amateur feel. This phase installs and enforces the system, then fixes the specific offenders as worked examples. The map is **replaced by an elegant regional grouping**, not repaired.

---

## 1. The root fix — an enforced design system

Professional-grade UI is not brilliant individual screens; it is *everything obeying the same invisible rules*. Install these as shared primitives and refactor every screen to use them. Nothing is styled ad hoc after this.

### 1.1 Spacing & grid (highest leverage)
- One spacing scale only: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64px**. No arbitrary margins/paddings anywhere; every gap is a scale value.
- A shared layout grid (e.g. 12-column with consistent gutters); page content aligns to the same left edge and column verticals across all screens.
- Consistent vertical rhythm: section spacing, card padding, and row height come from the scale, applied uniformly.
- *Most "amateur vs professional" perception is alignment and rhythm, not color or type.* "Almost aligned" is what reads as unpolished — enforce exact alignment.

### 1.2 Component library (build once, reuse ruthlessly)
One canonical implementation of each, used everywhere — no bespoke variants:
- `Card`, `Stat` (label + value + optional sublabel + optional tag), `Badge`/`Tag`, `Button` (fixed sizes, never auto-wrapping), `Table`, `Row`, `Dialog`, `Toast`, `EmptyState`, `Chevron`/nav controls, `SectionHeader`, `Hairline`.
- Every badge is the SAME component; every card the SAME; every button one of a fixed set of sizes. Coherence comes from reuse.

### 1.3 One number-formatting utility
- A single `formatMoney/formatNumber/formatPercent` used for every figure in the app. Consistent decimals, thousands separators, currency placement, tabular lining numerals everywhere. (€125,000 · €22,202 · €102,798 must all share identical weight, alignment, and formatting.)

### 1.4 Typographic hierarchy
- A fixed type scale (display / H1 / H2 / body / label / caption) with defined weight and color per level. One hero figure per card dominates (large, ink or brass); everything else recedes to consistent secondary/tertiary steps. Deliberate contrast, not flat uniformity.

### 1.5 Micro-craft tokens
- Hairlines: all the same 1px, same color (`#DDD8CC`-class). Corners: all sharp (0 radius) — no stray rounded element anywhere. Borders: one weight, one color. Focus/hover states: one consistent treatment across all interactive elements. No orphaned wrapping text.

---

## 2. Fix the three specific offenders (worked examples of the system)

### 2.1 Sign-in / persona list (Screenshot 1)
Refactor to a strict shared row grid so every row reads as clean verticals:
- Columns: [ name + email ] · [ role badge, fixed-width column, left-aligned to the same x for every row ] · [ → destination, fixed-width ] · [ button, fixed-width, single-line ].
- **Button: identical width on every row, never wraps.** Label "Sign in" (drop "as" — redundant beside the named persona). Single line always.
- Role badges align to the same horizontal position regardless of email length above them.
- Destination text (→ Owner dashboard, → Owner roll-up) does not wrap; column is wide enough or text is truncated with the column reserved.
- Consistent row height and divider hairlines from the spacing scale.

### 2.2 SEGREGATED · DGS trust mark (Screenshot 2)
The bordered box wraps to two lines and looks broken. Fix per the editorial aesthetic:
- **Preferred:** drop the border entirely; render as a small brass label with a thin underline — `SEGREGATED · DGS-PROTECTED` on one line, or stacked as two small labels, no box hugging wrapped text.
- **Or:** a true single-line pill that never wraps (container widened, letter-spacing controlled), sitting cleanly within the balance card, not colliding with it.
- A trust mark that looks broken undermines trust — this small element matters more than its size. It must look deliberate and crisp.

### 2.3 Replace the Europe map with elegant regional grouping (Screenshot 3)
Remove the disfigured continental map entirely. For portfolios of a handful of properties clustered in a few cities, a continental map is mostly empty space and reads as unfinished. Replace with a **designed regional grouping view**:
- Properties grouped by **country → region → city** (e.g. FR ▸ Île-de-France ▸ Paris; NL ▸ Noord-Holland ▸ Amsterdam; ES ▸ Cataluña ▸ Barcelona).
- Each group is a clean section with a **summary line**: unit count, balances, occupancy, and a **compliance status indicator** (the green/amber/red the map pins used — now as a small status dot or count per region, far more legible than dots on a void).
- Within a group, properties listed as clean rows; **clicking a property expands its detail inline directly below it** (ties to Phase 13 §2 — regional grouping + inline detail).
- Optional light geographic touch *only if it earns its place*: a small, accurate location chip per city (not a sparse full-continent map). If any map element is kept, it must use accurate simplified GeoJSON outlines in-palette — never hand-drawn polylines. Default recommendation: no continental map at all; the grouping is the view.
- This is more elegant, more information-dense, and more professional than dots on an empty map — and it scales gracefully from 6 units to 850.

---

## 3. Systemic craft sweep (make it feel engineered)

Beyond the three offenders, sweep every screen for the details that separate professional from amateur:
- **Alignment audit:** every screen's elements align to the shared grid; no "almost aligned" edges; labels, values, and columns share verticals.
- **Consistent formatting:** every number via the utility; every date one format; every currency one style.
- **Consistent components:** replace any one-off card/badge/button with the canonical component.
- **Density & restraint:** remove redundant labels, empty containers, and decorative filler. The best work removes — pare back to confident essentials.
- **States:** loading (skeletons), empty (guiding, not blank), hover/focus (consistent), on every interactive surface.
- **Optical polish:** consistent icon-free treatment (no stray icons), consistent hairlines and corners, balanced whitespace, no orphaned/wrapping text anywhere.

---

## 4. Build order & acceptance

1. **Install the design-system primitives** (§1): spacing scale, components, formatting utility, type scale, tokens.
2. **Refactor the three offenders** (§2) using those primitives — sign-in grid, trust mark, regional grouping replacing the map.
3. **Systemic sweep** (§3): alignment, formatting, component, and state audit across all screens.

**Acceptance:**
- A single spacing scale, component library, and number-formatting utility exist and are used app-wide (no ad-hoc styling).
- Sign-in rows sit on one shared grid: fixed-width single-line buttons, badges aligned to the same x, no wrapping.
- The SEGREGATED · DGS mark is crisp and single-line (or clean stacked labels), never a broken wrapped box.
- The continental map is gone; properties are shown as an elegant country→region→city grouping with per-region compliance status and inline property detail.
- Every number uses one formatting utility; hairlines, corners, and borders are consistent everywhere; type hierarchy has deliberate contrast.
- No "almost aligned" edges, orphaned wrapping text, stray rounded corners, or one-off components remain on any screen.
- A designer reviewing the product cannot find an inconsistency that betrays it as ad-hoc — it reads as one system.

---

## Note
Phase 16 is the craft pass. The goal is not a single beautiful screen but a product where every screen obeys the same invisible rules — which is exactly what makes work look like it came from the best design engineer. Fix the system, and the individual screens fix themselves; the three offenders are just the first proof.
