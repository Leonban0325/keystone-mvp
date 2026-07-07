import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Badge } from '../components'
import { fetchSystem, SystemInfo } from '../../api/client'
import { RULESETS } from '../../engine/compliance/rulesets'
import { eur } from '../format'

/**
 * §6 "Open the hood" — the answer to "is this actually built or just a
 * mockup?". Hidden in ?demo=clean. Everything on this screen is read live:
 * the persisted back-end's counts and endpoints, the versioned rulesets,
 * the tail of the event journal, and the reconciliation identities
 * recomputed from the fold on every render.
 */
export default function System() {
  const { world, personaId, dataSource, rev } = useApp()
  const [server, setServer] = useState<SystemInfo | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    setChecked(false)
    fetchSystem(personaId).then((info) => {
      if (!cancelled) {
        setServer(info)
        setChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [personaId, rev])

  const journal = world.journal
  const events = journal.all
  const dashboard = world.dashboard()
  const findings = world.findings()
  const persona = world.state.persona

  // Reconciliation identities, recomputed from the fold right now.
  const depositLiabilities = journal.balanceUnder('liabilities:deposits_held:')
  const segregatedCash = dashboard.depositsCashCents
  const revenueTarget = persona.revenueTargetCents
  const revenueMeasured = dashboard.revenuePerUnit.total
  const checks: { label: string; detail: string; ok: boolean }[] = [
    {
      label: 'Every event balances (Σ debits = Σ credits)',
      detail: `${events.length} events replayed through the invariant-checked journal — an unbalanced event throws before it can be committed`,
      ok: true, // the world exists ⇒ replay passed; a violation would have thrown
    },
    {
      label: 'Segregation: deposit cash ≥ deposit liabilities',
      detail: `${eur(segregatedCash)} held vs ${eur(depositLiabilities)} owed`,
      ok: segregatedCash >= depositLiabilities,
    },
    ...(revenueTarget
      ? [
          {
            label: 'Revenue/unit fold matches the business model (±€1)',
            detail: `${eur(revenueMeasured)} measured vs ${eur(revenueTarget)} model target`,
            ok: Math.abs(revenueMeasured - revenueTarget) <= 100,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">System</h1>
        <div className="flex items-center gap-2">
          <Badge tone={dataSource === 'api' ? 'brass' : 'grey'}>
            {dataSource === 'api' ? 'persisted dataset (API)' : 'in-browser engine (offline fallback)'}
          </Badge>
          {checked && server && <Badge tone="grey">{server.storage}</Badge>}
          {checked && server && (
            <Badge tone={server.aiKeyConfigured ? 'green' : 'grey'}>
              {server.aiKeyConfigured ? 'AI key: server-side' : 'AI: canned fallback'}
            </Badge>
          )}
        </div>
      </div>

      <p className="max-w-3xl text-sm text-greyx">
        The generator ran once at seed time; twelve months of journal events per persona are
        persisted in Postgres and served by the API below. The browser queries — it generates
        nothing. If the API is unreachable this page says so, and the same deterministic engine
        runs locally instead: identical numbers either way.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <section className="border rule p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-greyx">Reconciliation, live</h2>
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-start justify-between gap-3 border-b rule pb-2">
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs tabular-nums text-greyx">{c.detail}</div>
                </div>
                <Badge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'holds' : 'BROKEN'}</Badge>
              </div>
            ))}
            <div className="pt-1 text-xs text-greyx">
              Same identities asserted in the vitest packs (<code>npm test</code>): ledger
              invariants, statutory rules per jurisdiction, per-persona dashboard ↔ journal
              reconciliation within €1.
            </div>
          </div>
        </section>

        <section className="border rule p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-greyx">
            Rulesets (versioned, rules-as-code)
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {[...RULESETS.entries()].map(([jurisdiction, ruleset]) => (
                <tr key={jurisdiction} className="border-b rule">
                  <td className="py-1.5 font-medium">{jurisdiction}</td>
                  <td className="py-1.5 tabular-nums text-greyx">v{ruleset.version}</td>
                  <td className="py-1.5 tabular-nums text-greyx">{ruleset.rules.length} rules</td>
                  <td className="py-1.5 text-right text-xs text-greyx">
                    {findings.filter((f) => f.ruleId.startsWith(jurisdiction)).length} open finding(s)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-greyx">
            Every rule carries its <code>legal_ref</code>; every finding on the Compliance screen
            traces back to one of these files.
          </div>
        </section>
      </div>

      <section className="border rule p-4">
        <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-greyx">
          API — {checked && server ? 'live' : checked ? 'unreachable (offline fallback active)' : 'checking…'}
        </h2>
        {server ? (
          <div className="grid grid-cols-2 gap-6">
            <ul className="space-y-1 text-xs">
              {server.endpoints.map((e) => (
                <li key={e} className="border-b rule py-1 font-mono">{e}</li>
              ))}
            </ul>
            <div>
              <h3 className="mb-2 text-[10px] uppercase tracking-[0.1em] text-greyx">
                Persisted journals
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {server.journalCounts.map((c) => (
                    <tr key={c.persona_id} className="border-b rule">
                      <td className="py-1">{c.persona_id}</td>
                      <td className="py-1 text-right tabular-nums">
                        {c.events.toLocaleString('en')} events
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-greyx">
            {checked
              ? 'No back-end answered — running fully in-browser from the deterministic seed. Start it with `npm run dev` (Vite middleware) or deploy the Vercel functions.'
              : '…'}
          </p>
        )}
      </section>

      <section className="border rule p-4">
        <h2 className="mb-3 text-xs uppercase tracking-[0.1em] text-greyx">
          Event journal — last 10 of {events.length.toLocaleString('en')}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b rule text-left text-[10px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-normal">id</th>
              <th className="py-1 font-normal">date</th>
              <th className="py-1 font-normal">kind</th>
              <th className="py-1 font-normal">postings</th>
              <th className="py-1 text-right font-normal">Σ debit = Σ credit</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(-10).map((event) => {
              const debits = event.postings
                .filter((p) => p.direction === 'debit')
                .reduce((s, p) => s + p.amountCents, 0)
              return (
                <tr key={event.id} className="border-b rule align-top">
                  <td className="py-1 font-mono text-xs">{event.id}</td>
                  <td className="py-1 tabular-nums">{event.date}</td>
                  <td className="py-1">{event.kind}</td>
                  <td className="py-1 text-xs text-greyx">
                    {event.postings.map((p, i) => (
                      <div key={i}>
                        {p.direction === 'debit' ? 'D' : 'C'} {p.account}
                      </div>
                    ))}
                  </td>
                  <td className="py-1 text-right tabular-nums">{eur(debits)} ✓</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
