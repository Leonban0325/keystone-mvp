import { useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact } from '../format'
import { Badge, Button, Card } from '../components'
import { assetValueImpactCents, CAP_RATE } from '../../engine/savings/detectors'

export default function Savings() {
  const { world, rev, mutate } = useApp()
  void rev
  const [lastExecuted, setLastExecuted] = useState<string | null>(null)

  const opportunities = world.savingsOpportunities()
  const open = opportunities.filter((o) => !o.executed)
  const d = world.dashboard()
  const executed = opportunities.find((o) => o.id === lastExecuted)

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Savings Engine</h1>
        <div className="text-sm text-greyx">
          detectors over tariff, tax-comparable and grant feeds · success fee only when it lands
        </div>
      </div>

      <Card title={`Opportunity queue — ${open.length} open`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Opportunity</th>
              <th className="py-1 font-medium">Basis</th>
              <th className="py-1 text-right font-medium">Expected</th>
              <th className="py-1 text-right font-medium">Success fee</th>
              <th className="py-1 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id} className={`border-t rule ${o.executed ? 'opacity-50' : ''}`}>
                <td className="py-2">
                  <div className="font-medium">{o.label}</div>
                  <div className="text-xs text-greyx">{o.detail}</div>
                </td>
                <td className="py-2 text-xs text-brass">{o.programRef}</td>
                <td className="py-2 text-right">
                  {eurCompact(o.savingsCents)}
                  <span className="text-xs text-greyx">{o.kind === 'recurring' ? '/yr' : ' one-off'}</span>
                </td>
                <td className="py-2 text-right">{eur(o.successFeeCents)}</td>
                <td className="py-2 text-right">
                  {o.executed ? (
                    <Badge tone="green">executed</Badge>
                  ) : (
                    <Button
                      tone="primary"
                      onClick={() => {
                        mutate((w) => w.executeSavings(o))
                        setLastExecuted(o.id)
                      }}
                    >
                      Execute
                    </Button>
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
            <div>
              <Bridge
                before={d.noiAnnualCents - (executed.kind === 'recurring' ? executed.savingsCents : 0)}
                savings={executed.kind === 'recurring' ? executed.savingsCents : 0}
                oneOff={executed.kind === 'one_off' ? executed.savingsCents : 0}
              />
            </div>
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
                  <div className="mt-2 text-sm text-greyx">
                    Paid directly toward the rénovation works — DPE improves, rentability preserved.
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
