import { useApp } from '../store'
import { eur, formatDate } from '../format'
import { Badge, Button, Card, SeverityDot } from '../components'
import { Finding } from '../../engine/compliance/types'
import { RULESETS } from '../../engine/compliance/rulesets'
import { complianceTrackRecord } from '../../engine/analytics'

const REGIMES: { code: string; note: string }[] = [
  { code: 'FR', note: 'cap 1–2 mo · 10%/mo late penalty' },
  { code: 'NL', note: 'cap 2 mo · 14-day return' },
  { code: 'ES', note: 'fianza lodged regionally' },
  { code: 'DE', note: '3× Kaltmiete · tenant interest' },
  { code: 'AT', note: 'secure holding · interest' },
  { code: 'IT', note: 'cap 3 mo · legal-rate interest' },
]

export default function Compliance() {
  const { world, rev } = useApp()
  void rev
  const findings = world.findings()
  const queue = findings.filter((f) => f.severity !== 'info')
  const clocks = findings.filter((f) => f.ruleId.endsWith('-RETURN'))
  const record = complianceTrackRecord(world)

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Deposits & Compliance</h1>
        {record.resolved > 0 && (
          <div className="text-sm text-greyx">
            track record: <span className="font-medium text-ink">{record.resolved} resolved</span>{' '}
            this year · avg {record.avgDays.toFixed(1)} days to remediation
          </div>
        )}
      </div>

      <Card title="Six-regime coverage">
        <div className="grid grid-cols-6 gap-3">
          {REGIMES.map((regime) => {
            const live = RULESETS.has(regime.code)
            const count = queue.filter((f) => leaseJurisdiction(world, f) === regime.code).length
            return (
              <div key={regime.code} className={`border rule p-3 ${live ? '' : 'opacity-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{regime.code}</span>
                  {live ? (
                    count > 0 ? (
                      <Badge tone="red">{count}</Badge>
                    ) : (
                      <Badge tone="green">clear</Badge>
                    )
                  ) : (
                    <Badge tone="grey">ready</Badge>
                  )}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-greyx">{regime.note}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title={`Findings queue — ${queue.length} open`}>
        {queue.length === 0 && (
          <div className="text-sm text-greyx">No open findings. Legal by construction.</div>
        )}
        <div className="divide-y rule">
          {queue.map((finding) => (
            <FindingRow key={finding.ruleId + finding.leaseId} finding={finding} />
          ))}
        </div>
      </Card>

      <Card title="Return clocks">
        {clocks.length === 0 && <div className="text-sm text-greyx">No deposits awaiting return.</div>}
        <table className="w-full text-sm">
          <tbody>
            {clocks.map((clock) => {
              const breached = clock.meta!.breached === true
              const penalty = Number(clock.meta!.penaltyCents ?? 0)
              return (
                <tr key={clock.leaseId} className="border-t rule first:border-t-0">
                  <td className="py-2 font-medium">{leaseLabel(world, clock.leaseId)}</td>
                  <td className="py-2 text-greyx">
                    {eur(Number(clock.meta!.heldCents))} due back by {formatDate(String(clock.meta!.deadline))}
                  </td>
                  <td className="py-2 text-right">
                    {breached ? (
                      <span className="font-semibold text-[#B4392E]">
                        breached{penalty > 0 ? ` · penalty exposure ${eur(penalty)}` : ''}
                      </span>
                    ) : (
                      <span>{String(clock.meta!.daysRemaining)} days left</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function FindingRow(props: { finding: Finding }) {
  const { world, mutate } = useApp()
  const { finding } = props
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-1.5">
          <SeverityDot severity={finding.severity} />
        </span>
        <div>
          <div className="text-sm font-medium">
            {finding.ruleId} · {leaseLabel(world, finding.leaseId)}
          </div>
          <div className="mt-0.5 text-sm text-greyx">{finding.message}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-brass">
            {finding.legalRef}
          </div>
        </div>
      </div>
      {finding.remediation && (
        <Button tone="primary" onClick={() => mutate((w) => w.applyRemediation(finding))}>
          {finding.remediation.action === 'refund_excess'
            ? `Refund ${eur(finding.remediation.amountCents)}`
            : finding.remediation.label}
        </Button>
      )}
    </div>
  )
}

function leaseLabel(world: ReturnType<typeof useApp.getState>['world'], leaseId: string): string {
  const lease = world.state.leases.find((l) => l.id === leaseId)
  if (!lease) return leaseId
  const property = world.state.persona.properties.find((p) => p.id === lease.propertyId)
  return property?.label ?? leaseId
}

function leaseJurisdiction(
  world: ReturnType<typeof useApp.getState>['world'],
  finding: Finding,
): string {
  return world.state.leases.find((l) => l.id === finding.leaseId)?.jurisdiction ?? ''
}
