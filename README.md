# Keystone MVP

Presentation-grade demo for the startup competition. **Real logic, fake rails**: the
six-regime compliance engine and the event-sourced double-entry ledger are genuinely
implemented; every rail that would touch the outside world (bank, SEPA, cards, KYC,
tariff feeds) is a deterministic simulator driven by seed data and a demo clock.

The only real network call is the optional Anthropic API for lease extraction — with a
mandatory canned fallback, so **the pitch works fully offline**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # ledger invariants + statutory packs — part of the demo story
```

- `?demo=clean` hides the dev badges and the demo control panel for the actual pitch.
- Optional: put `VITE_ANTHROPIC_KEY=sk-ant-…` in `.env` to run lease extraction live;
  without it (or on any failure) the wizard silently uses the bundled canned extraction.
- State persists to `localStorage`; "Reset demo to seed" in the gear panel restores it.

## The three-minute demo script

1. **Dashboard** — "Ten units, three countries, €125k under management — one violation." *(10s)*
2. **Deposits & Compliance** — open the FR over-cap finding: rule ID, Loi 89-462 art. 22,
   one click, watch the ledger post the €200 refund and the finding close.
   "Legal by construction." *(45s)*
3. **Properties & Leases** — New lease → load the sample → AI extracts → confirm the money
   fields (suggest-only). "Deterministic core, probabilistic edges." *(40s)*
4. **Money** — the journal. "Every euro, dimensioned, double-entry, auditable." *(20s)*
5. **Savings Engine** — execute the taxe foncière appeal: NOI bridge, asset value +€8,400.
   "The fee buys the account; the savings pay for everything." *(30s)*
6. **Demo panel** — drag the DFR slider to zero: the failsafe flips pricing to flat-fee,
   the floor holds. "We modeled the bad weather." *(25s)*
7. **Reports** — quittance de loyer + FEC export. "And the accountant says yes." *(10s)*

### Persona extension (+90s) — "the same engine wearing three faces"

Switch personas from the gear panel (or the sign-in picker on first load):

- **B1 · Gestion Haussmann** — 850 units for 42 owner clients: the roll-up, drill-down,
  CSV rent-roll onboarding, 7% manager fee in the waterfall. One contract, 850 units.
- **B3 · Ibervia Living** — the refinancing-readiness pack against covenant thresholds.
- **C1 · Rentora** — the Partner Console: API keys, webhook deliveries, rev-share,
  60,000 → 4,200 activation funnel. One integration, sixty thousand units behind it.

End: "One ledger, one rules engine, three go-to-market motions."

## Numbers that must reconcile (and do — `npm test` proves it)

| Quantity | Value |
|---|---|
| Balances under management (A1) | €125,000 (€23.2k deposits + €101.8k reserves) |
| Revenue/unit/yr @ 2.25% DFR | €171.94 = SaaS €84 + NIM €75.94 + interchange €12 |
| Owner yield | 60% of DFR → €168.75/unit/yr |
| Keystone take at base rate | 60.75 bps (bank floor 12 bps, current 29.25 bps) |
| Failsafe | fires below 25 bps take (≈0.93% DFR) → flat-fee mode |

## Repo layout

```
src/engine/ledger        journal, postings, invariants, two-phase movements
src/engine/compliance    rulesets/*.json (legal_ref on every rule), evaluator, clocks
src/engine/indexation    IRL/CPI/ISTAT tables + revision calculator
src/engine/simulators    demo clock, SDD lifecycle + dunning FSM, yield accrual, card feed
src/engine/savings       detectors over simulated tariff/tax/grant feeds
src/engine/seed          fixed-seed persona generators (A1 default)
src/ai/extract.ts        the one real network call, with canned fallback
src/ui                   screens & demo panel
tests/                   vitest: ledger invariants + statutory packs
```

See `CLAUDE.md` for the full build specification and `docs/CLIENT-PERSONAS.md` for the
persona addendum (Phase 7).
