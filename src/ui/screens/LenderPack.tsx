import { useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact } from '../format'
import { Badge, Button, Card } from '../components'
import { trailingSpendCents } from '../../engine/analytics'

/** B3 · refinancing-readiness: pristine financials on demand, before the refi wall. */
export default function LenderPack() {
  const { world, rev } = useApp()
  void rev
  const [packOpen, setPackOpen] = useState(false)
  const pack = world.state.persona.lenderPack
  if (!pack) return <div className="text-sm text-greyx">No lender pack configured for this persona.</div>

  const activeLeases = world.state.leases.filter((l) => !l.moveOutDate)
  // H §3.2: NOI folds from actual rent roll − actual trailing spend, not a 20% assumption.
  const grossAnnual = activeLeases.reduce((s, l) => s + l.monthlyRentCents, 0) * 12
  const opexAnnual = trailingSpendCents(world)
  const noiAnnual = grossAnnual - opexAnnual
  const dscr = noiAnnual / pack.debtServiceAnnualCents
  const ltv = pack.loanCents / pack.valueCents
  const arrears = world.dashboard().arrearsCents

  const dscrOk = dscr >= pack.covenants.dscrMin
  const ltvHeadroom = pack.covenants.ltvMax - ltv
  const ltvStatus = ltv > pack.covenants.ltvMax ? 'breach' : ltvHeadroom < 0.01 ? 'amber' : 'ok'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Refinancing readiness</h1>
        <Button tone="primary" onClick={() => setPackOpen(!packOpen)}>
          {packOpen ? 'Close pack' : 'Generate lender pack'}
        </Button>
      </div>
      <div className="text-sm text-greyx">{pack.assetLabel}</div>

      <div className="grid grid-cols-4 gap-4">
        <Tile
          label={`DSCR (covenant ≥ ${pack.covenants.dscrMin.toFixed(2)})`}
          value={dscr.toFixed(2)}
          tone={dscrOk ? 'ok' : 'breach'}
        />
        <Tile
          label={`LTV (covenant ≤ ${(pack.covenants.ltvMax * 100).toFixed(0)}%)`}
          value={`${(ltv * 100).toFixed(1)}%`}
          tone={ltvStatus}
          note={ltvStatus === 'amber' ? `${(ltvHeadroom * 10000).toFixed(0)} bps of headroom — watch it` : undefined}
        />
        <Tile
          label="Occupancy"
          value={`${pack.occupancy.occupied}/${pack.occupancy.total}`}
          tone="ok"
        />
        <Tile
          label="Fianza lodgement"
          value={`${activeLeases.filter((l) => l.lodgementCertificate).length}/${activeLeases.length}`}
          tone={activeLeases.some((l) => l.lodgementCertificate === null) ? 'amber' : 'ok'}
          note="2 certificates missing — remediation queued"
        />
      </div>

      {packOpen && (
        <Card title="Lender pack — generated from the live ledger">
          <div className="print-artifact mx-auto max-w-3xl space-y-6 border rule bg-white p-8 text-sm">
            <div className="flex justify-between border-b rule pb-3">
              <div>
                <div className="text-lg font-semibold">{world.state.persona.name}</div>
                <div className="text-greyx">{pack.assetLabel}</div>
              </div>
              <div className="text-right text-greyx">
                <div>As of {world.today}</div>
                <div>Basis: double-entry journal, {world.journal.all.length} events</div>
              </div>
            </div>

            <section>
              <h3 className="mb-2 font-semibold">Income statement (annualised)</h3>
              <table className="w-full">
                <tbody>
                  <Row label="Gross rental income" value={eurCompact(grossAnnual)} />
                  <Row label="Operating expenses (trailing 12 months)" value={`− ${eurCompact(opexAnnual)}`} />
                  <Row label="Net operating income" value={eurCompact(noiAnnual)} bold />
                  <Row label="Debt service" value={`− ${eurCompact(pack.debtServiceAnnualCents)}`} />
                  <Row label="DSCR" value={dscr.toFixed(2)} bold />
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Arrears & collections</h3>
              <table className="w-full">
                <tbody>
                  <Row label="Rent receivables overdue" value={eur(arrears)} />
                  <Row label="Deposits held (segregated)" value={eurCompact(world.dashboard().depositsCashCents)} />
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">EPC distribution</h3>
              <div className="flex gap-2">
                {Object.entries(pack.epc).map(([grade, count]) => (
                  <div key={grade} className="flex-1 border rule p-2 text-center">
                    <div className="font-semibold">{grade}</div>
                    <div className="text-greyx">{count} units</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Rent roll (first 12 of {activeLeases.length})</h3>
              <table className="w-full text-xs">
                <tbody>
                  {activeLeases.slice(0, 12).map((lease) => (
                    <tr key={lease.id} className="border-t rule">
                      <td className="py-1">{world.state.persona.properties.find((p) => p.id === lease.propertyId)?.label}</td>
                      <td className="py-1">{lease.tenantNames[0]}</td>
                      <td className="py-1 text-right">{eur(lease.monthlyRentCents)}/mo</td>
                      <td className="py-1 text-right">{lease.lodgementCertificate ?? 'fianza pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="flex justify-end">
              <Button onClick={() => window.print()}>Print / PDF</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function Tile(props: { label: string; value: string; tone: 'ok' | 'amber' | 'breach'; note?: string }) {
  const colors = { ok: '#3D6B47', amber: '#B98A2F', breach: '#B4392E' }
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">{props.label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold" style={{ color: colors[props.tone] }}>
          {props.value}
        </span>
        <Badge tone={props.tone === 'ok' ? 'green' : props.tone === 'amber' ? 'brass' : 'red'}>
          {props.tone === 'ok' ? 'inside covenant' : props.tone === 'amber' ? 'amber' : 'breach'}
        </Badge>
      </div>
      {props.note && <div className="mt-1 text-xs text-greyx">{props.note}</div>}
    </Card>
  )
}

function Row(props: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={`border-t rule ${props.bold ? 'font-semibold' : ''}`}>
      <td className="py-1">{props.label}</td>
      <td className="py-1 text-right">{props.value}</td>
    </tr>
  )
}
