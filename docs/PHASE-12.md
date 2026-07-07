# KEYSTONE MVP — Addendum F: Phase 12 — Landing Page, Login & Access Layer

> Companion to Addenda A–E. Phase 12 wraps the app in an institutional front door: a marketing landing site, a login gate with per-persona demo credentials, and RBAC-scoped entry into the product. Every fresh visit resets to the landing page; the curated 12-month datasets persist untouched. **Principle:** the landing site is the public face; the app behind the login is the product; nothing claims a live service.

---

## 0. Scope clarification (resolve before building)

- **"Reset to landing on every access"** = the *session/navigation entry point* resets. Every fresh visit (new load, or after logout) lands on the marketing page; entering the app requires selecting/logging in as a persona. **It does NOT wipe data** — the Phase-10 Postgres datasets persist server-side (that persistence is a credibility feature). What resets is the session: you arrive logged out, at the front door.
- **"Login credentials for each persona"** = visible **demo credentials**, not real auth. No password hashing, no account security (wasted effort + risk if mistaken for real). A "sign in as" experience that sets the RBAC role and loads that persona's dataset scope.
- The existing demo persona-picker is **replaced by** this landing → login flow. The old picker can remain as a hidden `?demo=clean` quick-switch for stage use.

---

## 1. Landing page — institutional marketing site

A polished public site in the Keystone editorial-financial aesthetic (ink/paper/brass, hairline rules, no SaaS-template look). Nav: **Home · The Firm · Services · Insight · Client Access · Contact**. This is the first thing a judge sees — it should read like a real European fintech's site.

### 1.1 Home
- Hero: the positioning line — "The financial operating system for European rental real estate" — with a restrained keystone-arch motif; one primary CTA ("Client Access") and one secondary ("Request a demo" → Contact).
- Proof strip: markets served (FR·NL·ES live; DE·AT·IT engine-ready), a headline metric or two (e.g. "6 statutory regimes, one account"), partner-category trust line ("built on BaFin-regulated banking and escrow-as-a-service rails" — category-truthful, no real logos).
- Three value pillars (compliance-native · yield on idle cash · all-in-one operating system), each one line, no icon-card clutter.
- A "How it works" band linking to the money-rails concept (can deep-link into the app's rails view post-login, or show a static version here).

### 1.2 The Firm
- The mission/positioning narrative (from the business model exec summary), the "deterministic core, probabilistic edges" principle stated plainly, the regulatory posture (partner-rails, PSD2-agent, escrow-as-a-service — the licence-optional story).
- Team section: the four founders (Leon Ban · Duong Bui · Mark Gebrane · Bariah Al-besharah), names + role lines, no fabricated bios.
- "Target launch partners: tier-one BaFin-regulated institutions" — the ONE place a real bank name may appear, framed as ambition.

### 1.3 Services
- The seven-line product/service offering, grouped: banking & rent rails · deposit custody & statutory compliance · treasury & yield · card & spend · bookkeeping & tax · savings & optimization · analytics (NOI, refinancing, benchmarking).
- Segment framing: small-to-mid landlords · enterprise (property managers, housing associations, institutional BTR) · partnership distribution.

### 1.4 Insight
- A thought-leadership section: 3–4 short article cards (titles + summaries) on themes you own — "The €X billion of idle deposit capital in European rentals", "Why deposit compliance is fragmented across six regimes", "Europe's 2026–28 refinancing wall". These can be summary cards linking to short content or "coming soon" — the section signals a real firm with a point of view. (Optional: use the AI endpoint to draft the article bodies from bullet outlines.)

### 1.5 Client Access
- The login gate (§2). This is the entry to the product.

### 1.6 Contact
- A contact form (non-functional or logs to console/DB), office-location line (a plausible EU HQ), a "request enterprise demo" path. Reads as a real firm's contact page.

---

## 2. Login & demo credentials

### 2.1 The login screen (Client Access)
- Branded login: email + password fields, "Sign in", and a visible **"Demo access"** panel listing the persona logins so a judge (or you on stage) can enter any segment instantly. Presented as intentional demo access, not a security hole.
- Each credential maps to a persona, its RBAC role, and its dataset scope.

### 2.2 Persona credentials (demo)
| Login (email) | Password | Persona | Role | Lands on |
|---|---|---|---|---|
| `laurent@meridian-sci.demo` | `keystone` | Meridian SCI (mid landlord) | `owner` | Owner dashboard |
| `sofia@jansen.demo` | `keystone` | Sofia Jansen (solo landlord) | `owner` | Owner dashboard (Basic tier) |
| `ops@gestion-haussmann.demo` | `keystone` | Gestion Haussmann (property mgr) | `property_manager` | Owner roll-up |
| `admin@wonen-rijnland.demo` | `keystone` | Stichting Wonen Rijnland (housing assoc) | `institution` | Institution dashboard (white-label) |
| `cfo@ibervia-living.demo` | `keystone` | Ibervia Living SOCIMI (institutional BTR) | `institution` | Refinancing-readiness view |
| `partner@rentora.demo` | `keystone` | Rentora Software (PMS partner) | `partner` | Partner Console |

- Single shared demo password keeps stage use frictionless; credentials are shown on the login screen. (One consistent password is fine and clearly signals "demo".)
- "Sign in as" one-click buttons beside each, so no typing needed live.

### 2.3 Session
- Login sets a session (client-side token or server session) carrying `{personaId, role}`. No real auth; the token just scopes what the app loads and shows.
- **Logout** returns to the landing Home. Any fresh load with no active session → landing Home (the "reset to landing on every access" behaviour).

---

## 3. RBAC — role-scoped app

Roles already defined (Addendum A); Phase 12 enforces them at the gate and throughout:

| Role | Sees | Does not see |
|---|---|---|
| `owner` | Own dashboard, properties/leases, money (own ledger, per-lease default), compliance, savings, reports, cards | Owner roll-up, partner console, other owners' data |
| `property_manager` | Owner roll-up (42 clients), all managed portfolios, money at portfolio/owner/property/lease levels, bulk import, per-owner reports | Partner console; institution-only procurement views |
| `institution` | Portfolio dashboard, covenant/refinancing views, procurement badges, white-label theme, benchmarking | Partner console; individual-owner-management tooling |
| `partner` | Partner Console (API keys, webhook log, activation funnel, rev-share) | End-client money/compliance screens |

- Enforce in **both** routing (a role hitting an unauthorized route → redirect to its own home, not an error) **and** data (the API scopes every response to the session's persona/role — a manager can only read their managed units). Server-side scoping matters even in demo: it makes the RBAC real, not cosmetic.
- Navigation renders only the role's permitted sections — a partner never sees a "Compliance" tab.

---

## 4. Routing & reset behaviour

```
/                     → Landing Home (always, when no session)
/firm /services
/insight /contact     → Landing sections (public)
/access               → Login (Client Access)
   ── on login ──▶ /app  (role-scoped shell)
/app/*                → product, guarded by session + role
   ── logout ──▶ /      (back to Landing Home)
No session + /app/*   → redirect to /access
Fresh load anywhere   → if no session, Landing Home
```

- The landing site and the app are one deployment; the login is the boundary.
- `?demo=clean` may auto-skip the landing for rapid stage switching, but the default public experience always starts at Landing Home.

---

## 5. Build order & scope

1. **Routing + session + reset behaviour** — the skeleton: public landing routes, `/access` login, guarded `/app`, logout→landing.
2. **Login screen + persona credentials + one-click sign-in** — the demo entry.
3. **RBAC enforcement** — routing guards + API response scoping per role.
4. **Landing Home + The Firm + Services** — the core marketing pages (highest judge-facing value).
5. **Client Access polish + Contact** — the functional edges.
6. **Insight** — last; can ship as summary cards / "coming soon".

**Acceptance:** every fresh load with no session lands on the marketing Home · six persona logins work, each entering its RBAC-scoped app on its correct home screen · one-click "sign in as" needs no typing · a role cannot reach another role's routes or data (tested server-side) · logout returns to Home · landing site reads as a real European fintech in the Keystone aesthetic · no real bank logo anywhere; real bank name only on the "target partners" line · datasets persist across logins (login/logout does not reseed).

---

## Note
Phase 12 turns the demo into a product with a front door. The landing site is also your pitch's opening visual — when you present, you can start on the Home page ("this is Keystone") and sign in live as each persona to tell the segment stories, which is a stronger narrative arc than dropping straight into a dashboard.
