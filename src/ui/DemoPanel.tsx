import { useState } from 'react'
import { useApp } from './store'
import { pct } from './format'
import { Badge, Button } from './components'
import { BASE_DFR, KEYSTONE_MIN_TAKE, splitYield } from '../engine/simulators/economics'
import { personaIds, buildPersona } from '../engine/seed/personas'

/** Demo control panel — the gear. Hidden entirely under ?demo=clean. */
export default function DemoPanel(props: { onClose: () => void }) {
  const { world, rev, mutate, resetSeed, switchPersona, personaId } = useApp()
  void rev
  const [forceRLease, setForceRLease] = useState(world.state.leases[0]?.id ?? '')
  const dfr = world.state.dfr
  const split = splitYield(dfr)

  return (
    <aside className="fixed inset-y-0 right-0 z-20 w-96 overflow-y-auto border-l rule bg-paper p-6 shadow-none">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Demo controls</h2>
        <button onClick={props.onClose} className="text-greyx hover:text-ink">
          ✕
        </button>
      </div>

      <section className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">Clock</div>
        <div className="flex gap-2">
          <Button onClick={() => mutate((w) => w.advanceDays(1))}>+1 day</Button>
          <Button onClick={() => mutate((w) => w.advanceDays(7))}>+7 days</Button>
          <Button onClick={() => mutate((w) => w.advanceMonths(1))}>+1 month</Button>
        </div>
        <div className="mt-2 text-xs text-greyx">Today: {world.today}</div>
      </section>

      <section className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">
          ECB deposit facility rate — watch the NIM
        </div>
        <input
          type="range"
          min={0}
          max={0.04}
          step={0.0005}
          value={dfr}
          onChange={(e) => mutate((w) => w.setDfr(Number(e.target.value)))}
          className="w-full accent-[#B98A2F]"
        />
        <div className="mt-1 flex justify-between text-sm">
          <span className="font-semibold">{pct(dfr)}</span>
          <button
            className="text-xs text-brass underline"
            onClick={() => mutate((w) => w.setDfr(BASE_DFR))}
          >
            reset to 2.25%
          </button>
        </div>
        <table className="mt-3 w-full text-xs">
          <tbody>
            <tr className="border-t rule">
              <td className="py-1 text-greyx">Owner (60% of DFR)</td>
              <td className="py-1 text-right">{(split.ownerRate * 10_000).toFixed(1)} bps</td>
            </tr>
            <tr className="border-t rule">
              <td className="py-1 text-greyx">Bank (floor 12 bps)</td>
              <td className="py-1 text-right">{(split.bankRate * 10_000).toFixed(1)} bps</td>
            </tr>
            <tr className="border-t rule font-medium">
              <td className="py-1">Keystone take</td>
              <td className="py-1 text-right">{(split.keystoneRate * 10_000).toFixed(1)} bps</td>
            </tr>
          </tbody>
        </table>
        {split.failsafe ? (
          <div className="mt-3 border border-brass bg-white/60 p-3 text-xs">
            <span className="font-semibold text-brass">FAILSAFE ACTIVE</span> — Keystone take fell
            below {KEYSTONE_MIN_TAKE * 10_000} bps. Pricing flipped to flat-fee mode; the floor
            holds. We modeled the bad weather.
          </div>
        ) : (
          <div className="mt-3 text-xs text-greyx">
            Failsafe arms below {KEYSTONE_MIN_TAKE * 10_000} bps take (≈0.93% DFR).
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">
          Force R-transaction
        </div>
        <div className="flex gap-2">
          <select
            className="flex-1 border rule bg-transparent px-2 py-1 text-sm"
            value={forceRLease}
            onChange={(e) => setForceRLease(e.target.value)}
          >
            {world.state.leases.map((l) => (
              <option key={l.id} value={l.id}>
                {world.state.persona.properties.find((p) => p.id === l.propertyId)?.label ?? l.id}
              </option>
            ))}
          </select>
          <Button onClick={() => mutate((w) => w.forceRTransaction(forceRLease))}>Fail SDD</Button>
        </div>
        <p className="mt-2 text-xs text-greyx">
          The next collection bounces (AM04), the dunning FSM starts, and every posting is visible
          in the Money journal.
        </p>
      </section>

      <section className="mb-6">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">Persona</div>
        <div className="space-y-1">
          {personaIds().map((id) => {
            const p = buildPersona(id)
            return (
              <button
                key={id}
                onClick={() => switchPersona(id)}
                className={`block w-full border rule px-3 py-2 text-left text-sm hover:border-ink ${id === personaId ? 'border-ink' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <Badge tone="grey">
                    {p.segment}
                    {' · '}
                    {p.role.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-greyx">{p.subtitle}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <Button onClick={resetSeed}>Reset demo to seed</Button>
      </section>
    </aside>
  )
}
