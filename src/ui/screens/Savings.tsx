import { useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact, num } from '../format'
import { Badge, Button, Card, ConfirmDialog, toast } from '../components'
import {
  assetValueImpactCents,
  CAP_RATE,
  DETECTORS,
  engineStatus,
  savingsByOwner,
} from '../../engine/savings/detectors'

const DETECTOR_LABEL = Object.fromEntries(DETECTORS.map((d) => [d.kind, d.label]))

export default function Savings() {
  const { world, rev, mutate } = useApp()
  void rev
  const [lastExecuted, setLastExecuted] = useState<string | null>(null)
  const [showExecuted, setShowExecuted] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const opportunities = world.savingsOpportunities()
  const status = engineStatus(opportunities, world.state.leases.length)
  const visible = opportunities.filter((o) => (showExecuted ? o.executed : !o.executed))
  const executed = opportunities.find((o) => o.id === lastExecuted)
  const d = world.dashboard()
  const isPm = world.state.persona.role === 'property_manager'
  const leaderboard = isPm ? savingsByOwner(world.state.persona, opportunities).slice(0, 8) : []

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Savings Engine</h1>

      {/* §5 engine-status panel — the pitch centrepiece */}
      <Card>
        <div className="grid grid-cols-6 divide-x rule text-center">
          <StatusCell value={String(status.detectorCount)} label="detectors running" />
          <StatusCell value={num(status.leasesScanned)} label="leases scanned" />
          <StatusCell value={String(status.opportunities)} label="opportunities" />
          <StatusCell
            value={`${eurCompact(status.identifiedRecurringCents)}/yr`}
            label={`identified + ${eurCompact(status.identifiedOneOffCents)} one-off`}
          />
          <StatusCell value={eurCompact(status.executedCents)} label="executed" tone="#3D6B47" />
          <StatusCell value={String(status.openCount)} label="open" tone="#B98A2F" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t rule pt-3">
          {DETECTORS.map((detector) => {
            const n = opportunities.filter((o) => o.detector === detector.kind).length
            return (
              <Badge key={detector.kind} tone={n > 0 ? 'ink' : 'grey'}>
                {detector.label} · {n}
              </Badge>
            )
          })}
          <span className="ml-auto text-xs text-greyx">
            always-on · re-scans on every clock tick · success fee only when it lands
          </span>
        </div>
      </Card>

      <Card
        title={
          showExecuted
            ? `Executed — ${visible.length}`
            : `Opportunity queue — ${visible.length} open`
        }
      >
        <div className="mb-3">
          <Button tone="quiet" onClick={() => setShowExecuted(!showExecuted)}>
            {showExecuted ? '← Back to open queue' : `Show executed (${opportunities.length - status.openCount})`}
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Opportunity</th>
              <th className="py-1 font-medium">Logic trail</th>
              <th className="py-1 text-right font-medium">Expected</th>
              <th className="py-1 text-right font-medium">Confidence</th>
              <th className="py-1 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-t rule align-top">
                <td className="max-w-64 py-2 pr-3">
                  <div className="font-medium">{o.label}</div>
                  <div className="mt-0.5">
                    <Badge tone="grey">{DETECTOR_LABEL[o.detector]}</Badge>
                  </div>
                </td>
                <td className="max-w-72 py-2 pr-3 text-xs text-greyx">
                  “{o.logicTrail}”
                  <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-brass">
                    {o.programRef}
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  {eurCompact(o.savingsCents)}
                  <span className="text-xs text-greyx">
                    {o.kind === 'recurring' ? '/yr' : ' one-off'}
                  </span>
                  <div className="text-xs text-greyx">fee {eur(o.successFeeCents)}</div>
                </td>
                <td className="py-2 text-right">
                  <Badge tone={o.confidence > 0.85 ? 'green' : 'brass'}>
                    {(o.confidence * 100).toFixed(0)}%
                  </Badge>
                </td>
                <td className="py-2 text-right">
                  {o.executed ? (
                    <Badge tone="green">executed</Badge>
                  ) : (
                    <>
                      <Button tone="primary" onClick={() => setConfirmingId(o.id)}>
                        Execute
                      </Button>
                      {/* §2 confirm before the success fee posts. */}
                      <ConfirmDialog
                        open={confirmingId === o.id}
                        title={`Execute — ${o.label}?`}
                        body={
                          <span>
                            Expected {eurCompact(o.savingsCents)}
                            {o.kind === 'recurring' ? '/yr' : ' one-off'} · success fee{' '}
                            {eur(o.successFeeCents)} posts to the ledger on execution.
                          </span>
                        }
                        confirmLabel="Execute"
                        onCancel={() => setConfirmingId(null)}
                        onConfirm={() => {
                          setConfirmingId(null)
                          mutate((w) => w.executeSavings(o))
                          setLastExecuted(o.id)
                          toast(`${o.label} executed — success fee posted.`)
                        }}
                      />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {executed && (
        <Card title="NOI bridge — this is the asset-value moment">
          <div className="grid grid-cols-2 gap-8">
            <Bridge
              before={d.noiAnnualCents - (executed.kind === 'recurring' ? executed.savingsCents : 0)}
              savings={executed.kind === 'recurring' ? executed.savingsCents : 0}
              oneOff={executed.kind === 'one_off' ? executed.savingsCents : 0}
            />
            <div className="flex flex-col justify-center">
              {executed.kind === 'recurring' ? (
                <>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">
                    Asset value impact @ {(CAP_RATE * 100).toFixed(1)}% cap rate
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-[#3D6B47]">
                    +{eurCompact(assetValueImpactCents(executed))}
                  </div>
                  <div className="mt-2 text-sm text-greyx">
                    {eurCompact(executed.savingsCents)}/yr of durable NOI, capitalised. The fee buys
                    the account; the savings pay for everything.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">
                    One-off grant secured
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-[#3D6B47]">
                    +{eurCompact(executed.savingsCents)}
                  </div>
                </>
              )}
              <div className="mt-3 text-xs text-greyx">
                Success fee {eur(executed.successFeeCents)} posted to{' '}
                <span className="font-mono">income:fees:savings_share</span> — see the Money journal.
              </div>
            </div>
          </div>
        </Card>
      )}

      {isPm && leaderboard.length > 0 && (
        <Card title="Savings by owner client — what you show YOUR clients">
          <table className="w-full text-sm">
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.entityId} className="border-t rule first:border-t-0">
                  <td className="py-1.5 text-greyx">{i + 1}</td>
                  <td className="py-1.5">{row.name}</td>
                  <td className="py-1.5 text-right">{eurCompact(row.identifiedCents)} identified</td>
                  <td className="py-1.5 text-right text-[#3D6B47]">
                    {eurCompact(row.executedCents)} captured
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function StatusCell(props: { value: string; label: string; tone?: string }) {
  return (
    <div className="px-2">
      <div className="text-xl font-semibold" style={props.tone ? { color: props.tone } : undefined}>
        {props.value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-greyx">{props.label}</div>
    </div>
  )
}

function Bridge(props: { before: number; savings: number; oneOff: number }) {
  const after = props.before + props.savings
  const max = Math.max(after, props.before) * 1.1
  const bar = (v: number) => `${(v / max) * 100}%`
  const rows = [
    { label: 'NOI before', value: props.before, color: 'var(--grey)' },
    ...(props.savings > 0 ? [{ label: 'Savings executed', value: props.savings, color: '#3D6B47' }] : []),
    ...(props.oneOff > 0 ? [{ label: 'One-off grant', value: props.oneOff, color: '#3D6B47' }] : []),
    { label: 'NOI after', value: after, color: 'var(--ink)' },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="text-greyx">{r.label}</span>
            <span>{eurCompact(r.value)}</span>
          </div>
          <div className="h-4 w-full border rule">
            <div className="h-full" style={{ width: bar(r.value), background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}
