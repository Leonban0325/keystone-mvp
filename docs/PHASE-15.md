# KEYSTONE MVP — Addendum I: Phase 15 — The Pitch Deck (Landing-Page Section)

> Companion to Addenda A–H. Phase 15 builds the pitch deck **as a section of the landing page**, in the main nav alongside Home · The Firm · Services · Insight · [Pitch] · Client Access · Contact. It follows Guy Kawasaki's 10-slide framework, and it must be the **highest-quality, most humane, PropTech-appropriate** surface in the whole product. Built in-app (React), not an external file.

---

## 1. Where it lives & how it behaves

- **Nav placement:** add a nav item between Insight and Client Access. Label it "Pitch" or "For Investors" (pick one; "Pitch" is cleaner).
- **Format:** a full-screen, horizontally-advancing 10-slide deck experience embedded in the page — not a PDF, not a download. Arrow keys / on-screen chevrons / swipe advance slides; a slide counter (01–10) and a thin progress rail. A "present" affordance for full-screen.
- **Also linkable:** each slide is deep-linkable (`/pitch#3`) so you can jump to one live.
- Uses the same design tokens as the rest of the site but at its highest-craft expression (this is the showcase surface).
- Respects the prototype-realism rules: no "demo/simulated" language; figures match the business-model documents exactly.

---

## 2. Design direction — "humane PropTech", not austere fintech

This is the key brief. Earlier internal documents used a stark editorial-institutional look. The **pitch deck is different**: PropTech lives at the intersection of *homes* and *finance*, so the deck should feel **warm, human, and trustworthy** — the seriousness of a financial institution softened by the humanity of housing. Not cold, not flashy, not generic-startup.

### What "humane PropTech" means concretely
- **Warmth over sterility.** The ivory paper base stays, but lean into its warmth; allow soft, natural imagery of European residential settings (a Parisian apartment building, a Dutch canal house, keys, a front door) used sparingly and tastefully — real homes, real people, not stock-photo clichés or icons. Imagery is atmospheric and human, never decorative filler.
- **Human scale.** Talk about landlords and tenants as people with a real problem, not "users" or "SMB segments". A face, a home, a hand with keys — one humane image can carry the Problem slide better than any chart.
- **Craft and restraint.** High typographic quality (the serif-display + grotesque pairing), generous whitespace, considered motion. Premium, calm, confident — like a well-made product page from a company you'd trust with your money and your home.
- **Trust cues, softly.** The regulatory/serious side (BaFin partner, DGS protection, compliance) is present but expressed with warmth — "your deposit, protected and visible" rather than a wall of compliance jargon.

### Palette (warmed)
- Base: warm ivory `#F6F2E9`.
- Ink: `#14202B` (softened near-black navy).
- Primary accent: brass/ochre `#B0872F` — warm, human, not a tech-blue.
- A supporting warm neutral: soft stone `#9B8F7E` and a muted sage or terracotta as a *single* secondary accent for humanity (used very sparingly — a warm counterpoint to the brass).
- Real photographic imagery in muted, warm grade — never saturated, never bright-stock.

### Typography
- Display serif for headlines (humanist, warm — a Freight/Tiempos/Canela-class serif rather than a cold Didot), grotesque sans for data and labels. High quality is the point.
- Large, confident headline scale; never cramped.

### Motion (per Phase 11 rules — subtle, institutional, reveal-not-perform)
- Slow cross-dissolves between slides; gentle fade-and-rise reveals within a slide for pacing.
- Optional: a single hero number counts up once on its slide.
- Nothing bouncy, nothing looping, nothing that undercuts trust. Warmth comes from imagery and type, not from animation flash.

---

## 3. The 10 slides (Kawasaki framework, Keystone content)

Content matches the business-model documents exactly. Each slide: one idea, minimal text, a humane visual or a clean editorial chart.

**1 · Title.** Warm, spare. "Keystone" in the display serif; beneath, "The financial operating system for European rental real estate." A single atmospheric image (a European residential street / apartment façade, muted warm grade) or near-blank ivory with the keystone-arch mark. Founders' names — Leon Ban · Duong Bui · Mark Gebrane · Bariah Al-besharah — competition, date. A digital handshake: clean, human, confident.

**2 · Problem / Opportunity.** Make them *feel* it. A landlord's reality: rent in a personal account, deposits frozen and earning nothing, six countries' rules, a spreadsheet at tax time. One humane image (a person at a kitchen table with paperwork, or a set of keys) paired with the six-regime fragmentation shown simply. Brass stat: >€1 trillion of rent flows annually; ~25% sits idle. Emotional anchor, then the scale.

**3 · Value Proposition.** "One account. Legal by construction. Cash that finally earns." The before/after: tangle of disconnected tools → one calm account. Warm, clarifying. The relief of simplicity.

**4 · Underlying Magic.** "The compliance engine on rented rails." The clean three-layer architecture (compliance engine / escrow rail / partner-bank vault), Keystone beside the flow, money never on its balance sheet. Caption: deterministic core — rules decide, AI reads. Visual-led, minimal words.

**5 · Business Model.** "€225 per unit per year." The hero number, warm and large. Seven revenue lines; the €100 yield split (owner 60 · Keystone 27 · bank 13); ~two-thirds rate-independent. Simple: who pays, for what, how much, how it scales.

**6 · Go-to-Market.** "Clean-yield markets first." The rollout FR·NL·ES → PL·PT → DE·AT·IT, and the channels (letting agents, property managers, software integrations, partner-bank channel). One partnership → thousands of units. Specific, realistic, cost-conscious.

**7 · Competition.** "Alone in the quadrant." The 2×2 (single→multi-country compliance × software→moves-and-grows-money), competitors placed honestly with one-line deficiencies, Keystone alone upper-right. Name real categories and Goldbridge (validates, no EU engine). Never "no competitors".

**8 · Team.** Warm and human — this is the "can they pull it off" slide. The four founders, names + one credibility line each, set with care (a humane treatment — not cold initials-in-circles; consider simple, consistent, warm portraits or a tasteful typographic treatment). Advisors if any. Investors back people.

**9 · Financials & Metrics.** "Software margins on fintech revenue." The revenue + EBITDA-margin trajectory (Seed €4.5M/breakeven → Series A €21.4M/24% → Scale €239M/48%) and revenue-per-unit by client type. Show the assumptions behind the growth (units, adoption), not just the line. Footnote: steady-state at each milestone, ECB 2.25%.

**10 · Current Status & The Ask.** "Built. Climbing the licence ladder." The working prototype (compliance engine, multi-persona, on partner rails as PSD2 agent — done), the ladder (EMI at Series A → banking licence at scale), next 6–12 months, and the use-of-funds (product 50 / GTM 30 / market-entry incl. EMI 15 / G&A 5). End warm and confident: a real product, a real plan.

---

## 4. Quality bar & anti-patterns

This is the showcase surface — hold it to the highest standard.
- **No generic-startup deck look:** no gradient hero, no icon rows, no rounded stat-cards, no glassmorphism, no purple/teal.
- **No cold-institutional overcorrection either:** this is the one surface that should feel *warm and human* — imagery of real homes and people, humanist serif, soft secondary accent. Austere is wrong here.
- **Imagery discipline:** real, warm, muted European residential imagery, used sparingly and purposefully. Never bright stock photos, never clichéd "handshake/skyscraper" business imagery, never AI-obvious images. If good imagery isn't achievable, fall back to beautiful typography and the keystone motif rather than bad images.
- **Every number reconciles** to the business-model documents. A judge cross-checking the deck against the docs finds them identical.
- **Reads in 20 minutes, 30pt-min spirit:** one idea per slide, generous type, no text walls.

---

## 5. Build order & acceptance

1. Deck shell: nav item, 10-slide horizontal container, keyboard/swipe/chevron navigation, progress rail, full-screen present mode, deep-linking.
2. Design system for the deck: warmed palette, humanist serif + grotesque, motion per Phase 11.
3. Slides 1–5, then 6–10, content matching the documents.
4. Imagery pass (warm residential); typographic fallback where imagery isn't strong.
5. Polish: motion timing, reveal pacing, full-screen presentation quality.

**Acceptance:**
- "Pitch" sits in the landing nav; opens an in-page 10-slide deck (not a PDF/download).
- Follows Kawasaki's 10 slides in order; one idea per slide; content matches the business-model documents (numbers reconcile exactly).
- Design reads as *humane PropTech* — warm, human, premium — not generic-startup and not cold-institutional.
- Keyboard/swipe/chevron navigation, slide counter + progress rail, full-screen present mode, per-slide deep links all work.
- Subtle motion only (Phase 11 rules); no flashy or looping animation.
- No demo/simulated language; imagery (if used) is warm, muted, real, and sparing.

---

## Note
The pitch deck is Keystone's front-of-house. Where the prototype proves the product works and the documents prove the model holds, the deck makes people *feel* the mission — a warmer, more human register than any other surface, because PropTech is ultimately about homes and the people in them. Highest craft, most warmth, on this one.
