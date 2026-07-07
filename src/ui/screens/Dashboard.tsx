import { ReactNode } from 'react'
import { useApp } from '../store'
import { eur, eurCompact, formatDate, pct } from '../format'
import { Badge, Card, Stat, StatusRing } from '../components'
import { CashFlowChart, NoiBridgeChart, TrendLine, CHART_COLORS } from '../charts'
import {
  arrearsAging,
  findingsByCountry,
  lodgementCompleteness,
  monthlyFlows,
  nextPayout,
  noiBridge,
  occupancyTrend,
  payoutRun,
  rentDueNext30,
  upcomingLeaseEvents,
} from '../../engine/analytics'
import { DemoWorld } from '../../engine/world'

/**
 * Addendum B §1: the dashboard is a grid of widgets selected by role — every
 * widget a fold over the ledger. Shared top row, role-specific lower grid,
 * no dead space.
 */
export default function Dashboard() {
  const { world, rev } = useApp()
  void rev
  const d = world.dashboard()
  const savings = world.savingsOpportunities().filter((o) => !o.executed)
  const recurring = savings.filter((o) => o.kind === 'recurring').reduce((s, o) => s + o.savingsCents, 0)
  const oneOff = savings.filter((o) => o.kind === 'one_off').reduce((s, o) => s + o.savingsCents, 0)

  const widgets = widgetsFor(world)

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <div className="text-sm text-greyx">
          {d.unitCount} units · {eurCompact(d.balancesCents)} under management
        </div>
      </div>

      {/* Shared top row */}
      <div className="grid grid-cols-4 gap-5">
        <Card>
          <Stat label="NOI (annualised)" value={eurCompact(d.noiAnnualCents)} sub="rent roll − card-routed opex" />
        </Card>
        <Card>
          <Stat
            label="Balances"
            value={eurCompact(d.balancesCents)}
            sub={
              <span className="flex items-center gap-2">
                {eurCompact(d.depositsCashCents)} deposits · {eurCompact(d.reservesCashCents)} reserves{' '}
                <Badge tone="brass">Segregated</Badge>
              </span>
            }
          />
        </Card>
        <Card>
          <Stat
            label="Owner yield YTD"
            value={eurCompact(d.ownerYieldYtdCents)}
            sub={`accruing at ${pct(d.dfr * 0.6)} (60% of DFR ${pct(d.dfr)})`}
          />
        </Card>
        <Card>
          <Stat
            label="Savings identified"
            value={`${eurCompact(recurring)}/yr`}
            sub={oneOff > 0 ? `+ ${eurCompact(oneOff)} one-off grants` : 'open opportunities'}
          />
        </Card>
      </div>

      {/* Role-specific widget grid */}
      <div className="grid grid-cols-6 gap-5">{widgets}</div>
    </div>
  )
}

function widgetsFor(world: DemoWorld): ReactNode {
  const role = world.state.persona.role
  if (role === 'property_manager') {
    return (
      <>
        <ArrearsAgingWidget world={world} />
        <PayoutRunWidget world={world} />
        <ComplianceByCountryWidget world={world} />
        <CashFlowWidget world={world} months={6} span={4} title="Cash-flow timeline — 6 months" />
        <LeaseCalendarWidget world={world} />
        <NoiBridgeWidget world={world} span={4} />
        <RevenueDecompositionWidget world={world} />
      </>
    )
  }
  if (role === 'institution') {
    return (
      <>
        <OccupancyWidget world={world} />
        <LodgementWidget world={world} />
        <ComplianceRingWidget world={world} />
        <CashFlowWidget world={world} months={6} span={4} title="Cash-flow timeline — 6 months" />
        <LeaseCalendarWidget world={world} />
        <ProcurementWidget world={world} />
        <RevenueDecompositionWidget world={world} span={4} />
      </>
    )
  }
  // owner (Segment A)
  return (
    <>
      <NextPayoutWidget world={world} />
      <RentDueWidget world={world} />
      <EffectiveCostWidget world={world} />
      <ComplianceRingWidget world={world} />
      <CashFlowWidget world={world} months={6} span={4} title="Cash flow — 6 months" />
      <RevenueDecompositionWidget world={world} />
      <OwnerEconomicsWidget world={world} />
    </>
  )
}

// Literal class names so Tailwind's scanner sees them.
const SPANS: Record<number, string> = { 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', 6: 'col-span-6' }
const span = (n: number) => SPANS[n] ?? 'col-span-2'

// ── shared widgets ───────────────────────────────────────────────────────────

function ComplianceRingWidget({ world }: { world: DemoWorld }) {
  const d = world.dashboard()
  const warnings = world.findings().filter((f) => f.severity === 'warning').length
  return (
    <Card title="Compliance status" className={span(2)}>
      <div className="flex items-center gap-5">
        <StatusRing total={world.state.leases.length} warnings={warnings} violations={d.violations} />
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-medium">{d.violations}</span> violation{d.violations === 1 ? '' : 's'} ·{' '}
            <span className="font-medium">{warnings}</span> warning{warnings === 1 ? '' : 's'}
          </div>
          <div className="text-xs text-greyx">FR NL ES DE live · AT IT engine-ready</div>
        </div>
      </div>
    </Card>
  )
}

function CashFlowWidget(props: { world: DemoWorld; months: number; span?: number; title: string }) {
  const flows = monthlyFlows(props.world, props.months)
  const hasData = flows.some((f) => f.rentIn > 0)
  return (
    <Card title={props.title} className={span(props.span ?? 3)}>
      {hasData ? (
        <CashFlowChart data={flows} />
      ) : (
        <div className="text-sm text-greyx">No completed months yet — advance the demo clock.</div>
      )}
    </Card>
  )
}

function RevenueDecompositionWidget({ world, span: s }: { world: DemoWorld; span?: number }) {
  const d = world.dashboard()
  return (
    <Card title="Revenue / unit — trailing 12 months" className={span(s ?? 2)}>
      <table className="w-full text-sm">
        <tbody>
          <Row label="SaaS fee" value={eur(d.revenuePerUnit.saas)} />
          <Row label="NIM share" value={eur(d.revenuePerUnit.nim)} />
          <Row label="Interchange" value={eur(d.revenuePerUnit.interchange)} />
          <Row label="Savings & services" value={eur(d.revenuePerUnit.savings)} />
          <tr className="border-t rule font-semibold">
            <td className="py-1.5">Total / unit / yr</td>
            <td className="py-1.5 text-right">{eur(d.revenuePerUnit.total)}</td>
          </tr>
        </tbody>
      </table>
      {d.pricingMode === 'flat_fee' && (
        <div className="mt-3 border border-brass px-3 py-2 text-xs text-brass">
          Yield failsafe active — flat-fee mode; the floor holds.
        </div>
      )}
      <div className="mt-2 text-[11px] text-greyx">
        folded from the year's income postings · DFR today {pct(d.dfr)}
      </div>
    </Card>
  )
}

// ── owner widgets ────────────────────────────────────────────────────────────

function NextPayoutWidget({ world }: { world: DemoWorld }) {
  const payout = nextPayout(world)
  return (
    <Card title="Next payout" className={span(2)}>
      <div className="text-2xl font-semibold">{eurCompact(payout.amountCents)}</div>
      <div className="mt-1 text-sm text-greyx">on {formatDate(payout.date)} · rent − fees − card spend, buffer retained</div>
    </Card>
  )
}

function RentDueWidget({ world }: { world: DemoWorld }) {
  const due = rentDueNext30(world)
  return (
    <Card title="Rent due — next 30 days" className={span(2)}>
      <div className="text-2xl font-semibold">{eurCompact(due.expectedCents)}</div>
      <div className="mt-1 text-sm">
        {due.atRiskCents > 0 ? (
          <span className="text-[#B4392E]">{eurCompact(due.atRiskCents)} at risk (in dunning)</span>
        ) : (
          <span className="text-[#3D6B47]">nothing at risk</span>
        )}
      </div>
    </Card>
  )
}

function EffectiveCostWidget({ world }: { world: DemoWorld }) {
  const d = world.dashboard()
  const feesYr = d.revenuePerUnit.saas * d.unitCount
  const yieldYr = Math.round(d.balancesCents * d.dfr * 0.6)
  const net = feesYr - yieldYr
  return (
    <Card title="Effective software cost / yr" className={span(2)}>
      <div className={`text-2xl font-semibold ${net < 0 ? 'text-[#3D6B47]' : ''}`}>{eur(net)}</div>
      <div className="mt-1 text-sm text-greyx">
        fees {eur(feesYr)} − your yield {eur(yieldYr)}
        {net < 0 && ' — the yield pays for it'}
      </div>
    </Card>
  )
}

function OwnerEconomicsWidget({ world }: { world: DemoWorld }) {
  const d = world.dashboard()
  return (
    <Card title="Owner economics" className={span(2)}>
      <table className="w-full text-sm">
        <tbody>
          <Row label="Owner yield / unit / yr" value={eur(d.ownerYieldPerUnitCents)} />
          <Row label="Arrears outstanding" value={eur(d.arrearsCents)} />
          <Row label="Operating float" value={eurCompact(d.operatingCents)} />
        </tbody>
      </table>
    </Card>
  )
}

// ── property-manager widgets ─────────────────────────────────────────────────

function ArrearsAgingWidget({ world }: { world: DemoWorld }) {
  const { setScreen } = useApp.getState()
  const buckets = arrearsAging(world)
  const max = Math.max(...buckets.map((b) => b.amountCents), 1)
  return (
    <Card title="Arrears aging" className={span(2)}>
      <div className="flex h-28 items-end gap-3">
        {buckets.map((bucket) => (
          <button
            key={bucket.label}
            className="flex flex-1 cursor-pointer flex-col justify-end text-center"
            onClick={() => setScreen('money')}
            title="Open in Money"
          >
            <div className="text-xs">{bucket.count > 0 ? eurCompact(bucket.amountCents) : '—'}</div>
            <div
              className="mt-1 w-full"
              style={{
                height: `${Math.max(3, (bucket.amountCents / max) * 70)}px`,
                background: bucket.label === '90+' || bucket.label === '61–90' ? CHART_COLORS.red : CHART_COLORS.brass,
                opacity: bucket.amountCents > 0 ? 1 : 0.15,
              }}
            />
            <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-greyx">{bucket.label}d</div>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-greyx">click a bucket → Money roll-up</div>
    </Card>
  )
}

function PayoutRunWidget({ world }: { world: DemoWorld }) {
  const run = payoutRun(world)
  const pctDone = run.total ? (run.done / run.total) * 100 : 0
  return (
    <Card title="Owner payout run — this month" className={span(2)}>
      <div className="text-2xl font-semibold">
        {run.done} <span className="text-base font-normal text-greyx">of {run.total} owners distributed</span>
      </div>
      <div className="mt-2 h-2 border rule">
        <div className="h-full" style={{ width: `${pctDone}%`, background: CHART_COLORS.green }} />
      </div>
      {run.pending.length > 0 && (
        <div className="mt-2 truncate text-xs text-greyx">pending: {run.pending.join(', ')}</div>
      )}
    </Card>
  )
}

function ComplianceByCountryWidget({ world }: { world: DemoWorld }) {
  const rows = findingsByCountry(world)
  const max = Math.max(...rows.map((r) => r.violations + r.warnings), 1)
  return (
    <Card title="Compliance by country" className={span(2)}>
      {rows.length === 0 && <div className="text-sm text-greyx">Clean across all regimes.</div>}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.jurisdiction} className="flex items-center gap-2 text-sm">
            <span className="w-8 font-semibold">{row.jurisdiction}</span>
            <div className="flex h-3 flex-1 border rule">
              <div style={{ width: `${(row.violations / max) * 100}%`, background: CHART_COLORS.red }} />
              <div style={{ width: `${(row.warnings / max) * 100}%`, background: CHART_COLORS.brass }} />
            </div>
            <span className="w-16 text-right text-xs text-greyx">
              {row.violations}V · {row.warnings}W
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function LeaseCalendarWidget({ world }: { world: DemoWorld }) {
  const events = upcomingLeaseEvents(world, 60)
  const tone = { 'move-out': 'red', indexation: 'brass', renewal: 'grey' } as const
  return (
    <Card title="Lease events — next 60 days" className={span(2)}>
      {events.length === 0 && <div className="text-sm text-greyx">Nothing due.</div>}
      <table className="w-full text-sm">
        <tbody>
          {events.slice(0, 6).map((event) => (
            <tr key={`${event.leaseId}-${event.type}`} className="border-t rule first:border-t-0">
              <td className="py-1 text-greyx">{formatDate(event.date)}</td>
              <td className="py-1">
                <Badge tone={tone[event.type]}>{event.type}</Badge>
              </td>
              <td className="max-w-40 truncate py-1">{event.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function NoiBridgeWidget({ world, span: s }: { world: DemoWorld; span?: number }) {
  return (
    <Card title="Portfolio NOI bridge" className={span(s ?? 3)}>
      <NoiBridgeChart steps={noiBridge(world)} />
    </Card>
  )
}

// ── institution widgets ──────────────────────────────────────────────────────

function OccupancyWidget({ world }: { world: DemoWorld }) {
  const trend = occupancyTrend(world, 6)
  const current = world.state.leases.filter((l) => !l.moveOutDate || l.moveOutDate > world.today).length
  return (
    <Card title="Occupancy trend" className={span(2)}>
      <div className="text-2xl font-semibold">
        {current}
        <span className="text-base font-normal text-greyx"> / {world.state.persona.properties.length} occupied</span>
      </div>
      <TrendLine data={trend.map((t) => ({ month: t.month, value: t.occupied }))} height={120} moneyAxis={false} color={CHART_COLORS.ink} />
    </Card>
  )
}

function LodgementWidget({ world }: { world: DemoWorld }) {
  const lodgement = lodgementCompleteness(world)
  if (!lodgement) {
    return <ComplianceByCountryWidget world={world} />
  }
  const complete = lodgement.done === lodgement.total
  return (
    <Card title="Fianza lodgement completeness" className={span(2)}>
      <div className={`text-2xl font-semibold ${complete ? 'text-[#3D6B47]' : 'text-brass'}`}>
        {lodgement.done} / {lodgement.total}
      </div>
      <div className="mt-2 h-2 border rule">
        <div
          className="h-full"
          style={{ width: `${(lodgement.done / lodgement.total) * 100}%`, background: complete ? CHART_COLORS.green : CHART_COLORS.brass }}
        />
      </div>
      <div className="mt-2 text-xs text-greyx">
        {complete ? 'every certificate on file' : `${lodgement.total - lodgement.done} certificates missing — remediation queued`}
      </div>
    </Card>
  )
}

function ProcurementWidget({ world }: { world: DemoWorld }) {
  const badges = world.state.persona.procurement ?? []
  return (
    <Card title="Procurement & assurance" className={span(4)}>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Badge key={badge} tone="ink">
            {badge}
          </Badge>
        ))}
      </div>
      {world.state.persona.storyTags.sampleNote && (
        <div className="mt-3 text-xs text-greyx">
          Loaded: {world.state.persona.storyTags.sampleNote} — durable fees + the savings engine carry the model at low float.
        </div>
      )}
    </Card>
  )
}

function Row(props: { label: string; value: string }) {
  return (
    <tr className="border-t rule first:border-t-0">
      <td className="py-1.5 text-greyx">{props.label}</td>
      <td className="py-1.5 text-right">{props.value}</td>
    </tr>
  )
}
