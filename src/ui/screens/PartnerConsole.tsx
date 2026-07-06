import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { eurCompact } from '../format'
import { Badge, Card } from '../components'

/** Segment C · the Partner Console — one contract, thousands of units behind it. */
export default function PartnerConsole() {
  const { world, rev } = useApp()
  void rev
  const partner = world.state.persona.partner
  if (!partner) {
    return <div className="text-sm text-greyx">No partner dataset on this persona.</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Partner Console</h1>
        <div className="text-sm text-greyx">{world.state.persona.subtitle}</div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {partner.funnel && <FunnelCard funnel={partner.funnel} />}
        {partner.revShare && <RevShareCard revShare={partner.revShare} />}
        {partner.apiKeys && <ApiKeysCard keys={partner.apiKeys} />}
        {partner.webhookSeed && <WebhookLog seed={partner.webhookSeed} />}
        {partner.referral && <ReferralCard referral={partner.referral} />}
        {partner.branches && (
          <>
            <BranchMap branches={partner.branches} note={partner.affinityNote} />
            <BranchLeaderboard branches={partner.branches} />
          </>
        )}
      </div>
    </div>
  )
}

function FunnelCard(props: {
  funnel: { eligible: number; activated: number; curve: { month: string; activated: number }[] }
}) {
  const { eligible, activated, curve } = props.funnel
  const maxY = Math.max(...curve.map((c) => c.activated))
  const points = curve
    .map((c, i) => `${(i / (curve.length - 1)) * 280 + 10},${90 - (c.activated / maxY) * 75}`)
    .join(' ')
  return (
    <Card title="Activation funnel">
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-2xl font-semibold">{eligible.toLocaleString('en-IE')}</div>
          <div className="text-xs text-greyx">eligible units on platform</div>
        </div>
        <div className="text-2xl text-greyx">→</div>
        <div>
          <div className="text-2xl font-semibold text-[#3D6B47]">{activated.toLocaleString('en-IE')}</div>
          <div className="text-xs text-greyx">activated on Keystone</div>
        </div>
        <div className="ml-auto text-sm text-greyx">
          {((activated / eligible) * 100).toFixed(1)}% and climbing
        </div>
      </div>
      <svg viewBox="0 0 300 100" className="mt-4 w-full">
        <polyline points={points} fill="none" stroke="var(--brass)" strokeWidth="2" />
        {curve.map((c, i) => (
          <g key={c.month}>
            <circle
              cx={(i / (curve.length - 1)) * 280 + 10}
              cy={90 - (c.activated / maxY) * 75}
              r="2.5"
              fill="var(--ink)"
            />
            {i % 2 === 0 && (
              <text
                x={(i / (curve.length - 1)) * 280 + 10}
                y={99}
                textAnchor="middle"
                fontSize="7"
                fill="var(--grey)"
              >
                {c.month}
              </text>
            )}
          </g>
        ))}
      </svg>
    </Card>
  )
}

function RevShareCard(props: {
  revShare: { partnerSharePct: number; perUnitAnnualCents: number; activatedUnits: number }
}) {
  const { partnerSharePct, perUnitAnnualCents, activatedUnits } = props.revShare
  const gross = perUnitAnnualCents * activatedUnits
  const partnerCut = Math.round(gross * partnerSharePct)
  return (
    <Card title="Revenue share">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-t rule first:border-t-0">
            <td className="py-1.5 text-greyx">Activated units</td>
            <td className="py-1.5 text-right">{activatedUnits.toLocaleString('en-IE')}</td>
          </tr>
          <tr className="border-t rule">
            <td className="py-1.5 text-greyx">Revenue / unit / yr</td>
            <td className="py-1.5 text-right">{eurCompact(perUnitAnnualCents)}</td>
          </tr>
          <tr className="border-t rule">
            <td className="py-1.5 text-greyx">Gross ARR on activated base</td>
            <td className="py-1.5 text-right">{eurCompact(gross)}</td>
          </tr>
          <tr className="border-t rule font-semibold">
            <td className="py-1.5">Partner share ({(partnerSharePct * 100).toFixed(0)}%)</td>
            <td className="py-1.5 text-right">{eurCompact(partnerCut)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-xs text-greyx">
        Same €172/unit economics as the direct book — the partner is paid from the deal, not from a
        marketing budget.
      </p>
    </Card>
  )
}

function ApiKeysCard(props: { keys: { label: string; key: string; created: string }[] }) {
  return (
    <Card title="API keys">
      <table className="w-full text-sm">
        <tbody>
          {props.keys.map((k) => (
            <tr key={k.label} className="border-t rule first:border-t-0">
              <td className="py-1.5">{k.label}</td>
              <td className="py-1.5 font-mono text-xs">{k.key}</td>
              <td className="py-1.5 text-right text-xs text-greyx">created {k.created}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-greyx">
        Embedded flows render Keystone screens inside the partner chrome; the ledger and rules
        engine stay ours.
      </p>
    </Card>
  )
}

const WEBHOOK_STATUS = ['200 · 41ms', '200 · 38ms', '200 · 55ms', '200 · 47ms', '200 · 62ms']

function WebhookLog(props: { seed: { event: string; endpoint: string }[] }) {
  const [rows, setRows] = useState(() =>
    props.seed.map((s, i) => ({
      ...s,
      id: i,
      at: `12:0${i % 10}:${String(11 + i * 7).padStart(2, '0')}`,
      status: WEBHOOK_STATUS[i % WEBHOOK_STATUS.length],
    })),
  )

  // Simulated deliveries streaming in while the console is open.
  useEffect(() => {
    const timer = setInterval(() => {
      setRows((prev) => {
        const template = props.seed[prev.length % props.seed.length]
        const now = new Date()
        return [
          {
            ...template,
            id: prev.length,
            at: now.toTimeString().slice(0, 8),
            status: WEBHOOK_STATUS[prev.length % WEBHOOK_STATUS.length],
          },
          ...prev,
        ].slice(0, 12)
      })
    }, 2500)
    return () => clearInterval(timer)
  }, [props.seed])

  return (
    <Card title="Webhook deliveries — streaming">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.id}-${row.at}`} className="border-t rule first:border-t-0">
              <td className="py-1 text-greyx">{row.at}</td>
              <td className="py-1 font-mono">{row.event}</td>
              <td className="py-1 text-right">
                <Badge tone="green">{row.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ReferralCard(props: {
  referral: { referred: number; onboarded: number; balancesLandedCents: number; collarNote: string }
}) {
  const { referred, onboarded, balancesLandedCents, collarNote } = props.referral
  return (
    <Card title="SME referral funnel">
      <div className="flex items-center gap-4">
        <Step label="referred" value={referred} />
        <span className="text-greyx">→</span>
        <Step label="onboarded" value={onboarded} />
        <span className="text-greyx">→</span>
        <Step label="balances landed" value={balancesLandedCents} money />
      </div>
      <div className="mt-4 border rule bg-white/60 p-3 text-sm">
        <span className="font-mono text-xs">{collarNote}</span>
        <p className="mt-1 text-xs text-greyx">
          The bank's channel is paid by the same deal that rents us the balance sheet — every party
          in the tripartite structure distributes.
        </p>
      </div>
    </Card>
  )
}

function Step(props: { label: string; value: number; money?: boolean }) {
  return (
    <div>
      <div className="text-xl font-semibold">
        {props.money ? eurCompact(props.value) : props.value.toLocaleString('en-IE')}
      </div>
      <div className="text-xs text-greyx">{props.label}</div>
    </div>
  )
}

function BranchMap(props: {
  branches: { name: string; x: number; y: number; live: boolean; units: number; importPct?: number }[]
  note?: string
}) {
  return (
    <Card title="Branch activation — France">
      <svg viewBox="0 0 100 78" className="mx-auto w-72">
        {/* Rough hexagon of France */}
        <polygon
          points="48,2 71,14 74,26 96,36 88,52 68,72 55,75 44,66 30,70 20,56 4,48 12,34 2,26 26,20 34,6"
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="1"
        />
        {props.branches.map((b) => (
          <g key={b.name}>
            <circle
              cx={b.x}
              cy={b.y}
              r={b.live ? 2.4 : 1.6}
              fill={b.live ? 'var(--brass)' : 'none'}
              stroke={b.live ? 'var(--brass)' : 'var(--grey)'}
              strokeWidth="0.6"
            >
              <title>
                {b.name} — {b.live ? `${b.units} units live` : 'not yet live'}
              </title>
            </circle>
            {b.importPct !== undefined && (
              <circle cx={b.x} cy={b.y} r="3.6" fill="none" stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="1.5 1" />
            )}
          </g>
        ))}
      </svg>
      <div className="mt-2 text-center text-xs text-greyx">
        34 of 120 branches live · dashed ring = rent-roll import in flight (60%)
      </div>
      {props.note && <div className="mt-2 text-center text-xs text-brass">{props.note}</div>}
    </Card>
  )
}

function BranchLeaderboard(props: {
  branches: { name: string; live: boolean; units: number }[]
}) {
  const live = props.branches.filter((b) => b.live).sort((a, b) => b.units - a.units)
  const max = live[0]?.units ?? 1
  return (
    <Card title="Branch leaderboard">
      <table className="w-full text-sm">
        <tbody>
          {live.slice(0, 8).map((b, i) => (
            <tr key={b.name} className="border-t rule first:border-t-0">
              <td className="py-1.5 text-greyx">{i + 1}</td>
              <td className="py-1.5">{b.name}</td>
              <td className="w-1/2 py-1.5">
                <div className="h-2 border rule">
                  <div className="h-full bg-brass" style={{ width: `${(b.units / max) * 100}%` }} />
                </div>
              </td>
              <td className="py-1.5 text-right">{b.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
