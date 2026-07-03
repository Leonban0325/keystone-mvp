import { useApp } from '../store'
import { eur, eurCompact, pct } from '../format'
import { Badge, Card, Stat, StatusRing } from '../components'

export default function Dashboard() {
  const { world, rev } = useApp()
  void rev
  const d = world.dashboard()
  const findings = world.findings()
  const warnings = findings.filter((f) => f.severity === 'warning').length
  const savings = world.savingsOpportunities().filter((o) => !o.executed)
  const recurring = savings.filter((o) => o.kind === 'recurring').reduce((s, o) => s + o.savingsCents, 0)
  const oneOff = savings.filter((o) => o.kind === 'one_off').reduce((s, o) => s + o.savingsCents, 0)
  const yieldYtd = ytdOwnerYield(world)

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
        <div className="text-sm text-greyx">
          {d.unitCount} units · 3 countries · {eurCompact(d.balancesCents)} under management
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <Card>
          <Stat label="NOI (annualised)" value={eurCompact(d.noiAnnualCents)} sub="net of card-routed opex" />
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
            value={eurCompact(yieldYtd)}
            sub={`accruing at ${pct(d.dfr * 0.6)} (60% of DFR ${pct(d.dfr)})`}
          />
        </Card>
        <Card>
          <Stat
            label="Savings identified"
            value={`${eurCompact(recurring)}/yr`}
            sub={oneOff > 0 ? `+ ${eurCompact(oneOff)} one-off grants` : 'all opportunities executed'}
          />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card title="Compliance status">
          <div className="flex items-center gap-5">
            <StatusRing total={world.state.leases.length} warnings={warnings} violations={d.violations} />
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">{d.violations}</span> violation{d.violations === 1 ? '' : 's'} ·{' '}
                <span className="font-medium">{warnings}</span> warning{warnings === 1 ? '' : 's'}
              </div>
              <div className="text-xs text-greyx">
                Six-regime rules engine · FR NL ES live, DE AT IT engine-ready
              </div>
            </div>
          </div>
        </Card>

        <Card title={`Revenue per unit — annualised @ DFR ${pct(d.dfr)}`}>
          <table className="w-full text-sm">
            <tbody>
              <Row label="SaaS fee" value={eur(d.revenuePerUnit.saas)} />
              <Row label="NIM share" value={eur(d.revenuePerUnit.nim)} />
              <Row label="Interchange" value={eur(d.revenuePerUnit.interchange)} />
              <tr className="border-t rule font-semibold">
                <td className="py-1.5">Total / unit / yr</td>
                <td className="py-1.5 text-right">{eur(d.revenuePerUnit.total)}</td>
              </tr>
            </tbody>
          </table>
          {d.pricingMode === 'flat_fee' && (
            <div className="mt-3 border border-brass px-3 py-2 text-xs text-brass">
              Yield failsafe active — pricing switched to flat-fee mode; the floor holds.
            </div>
          )}
        </Card>

        <Card title="Owner economics">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Owner yield / unit / yr" value={eur(d.ownerYieldPerUnitCents)} />
              <Row label="Arrears outstanding" value={eur(d.arrearsCents)} />
              <Row label="Operating float" value={eurCompact(d.operatingCents)} />
            </tbody>
          </table>
          <div className="mt-3 text-xs text-greyx">
            Same ledger the accountant exports — every figure folds from journal events.
          </div>
        </Card>
      </div>
    </div>
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

function ytdOwnerYield(world: ReturnType<typeof useApp.getState>['world']): number {
  const year = world.today.slice(0, 4)
  let total = 0
  for (const event of world.journal.all) {
    if (event.kind !== 'yield_accrual' || !event.date.startsWith(year)) continue
    for (const p of event.postings) {
      if (p.account.startsWith('liabilities:owner_payable:') && p.direction === 'credit') {
        total += p.amountCents
      }
    }
  }
  return total
}
