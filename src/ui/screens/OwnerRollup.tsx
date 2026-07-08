import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact, eurWhole } from '../format'
import { Badge, Button, Card } from '../components'
import { entityBalances } from '../../engine/simulators/yieldAccrual'
import { RentRollRow } from '../../engine/world'
import { Jurisdiction } from '../../engine/ledger/types'
import rentRollFixture from '../../fixtures/rent-roll-morel.csv?raw'

/** B1 · the owner-of-owners surface: 42 clients, one contract, 850 units. */
export default function OwnerRollup() {
  const { world, rev } = useApp()
  void rev
  const [expanded, setExpanded] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const persona = world.state.persona
  const findings = world.findings()
  const findingsByEntity = useMemo(() => {
    const map = new Map<string, number>()
    for (const finding of findings) {
      if (finding.severity === 'info') continue
      const lease = world.state.leases.find((l) => l.id === finding.leaseId)
      if (lease) map.set(lease.entityId, (map.get(lease.entityId) ?? 0) + 1)
    }
    return map
  }, [findings, world])

  const owners = persona.entities.filter((e) => e.id !== persona.managerEntityId)
  const managerFeeYtd = world.journal.balance(
    `liabilities:owner_payable:${persona.managerEntityId}`,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Owner roll-up</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-greyx">
            {owners.length} owner clients · {world.state.leases.length} units ·{' '}
            {persona.storyTags.teamSeats} team seats
          </span>
          <Button tone="primary" onClick={() => setImportOpen(!importOpen)}>
            {importOpen ? 'Close import' : 'Import rent roll (CSV)'}
          </Button>
        </div>
      </div>

      {importOpen && <RentRollImportWizard onDone={() => setImportOpen(false)} />}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">Balances under management</div>
          <div className="mt-1 text-2xl font-semibold">{eurCompact(world.dashboard().balancesCents)}</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">Open findings</div>
          <div className="mt-1 text-2xl font-semibold">
            {findings.filter((f) => f.severity !== 'info').length}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">Manager fee accrued (payable)</div>
          <div className="mt-1 text-2xl font-semibold">{eurCompact(managerFeeYtd)}</div>
          <div className="mt-1 text-xs text-greyx">7% of gross rents, skimmed on-ledger</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">Team seats</div>
          <div className="mt-1 text-2xl font-semibold">{persona.storyTags.teamSeats}</div>
          <div className="mt-1 text-xs text-greyx">per-owner access scopes</div>
        </Card>
      </div>

      <Card title={`By owner client — ${owners.length} rows`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Owner</th>
              <th className="py-1 text-right font-medium">Units</th>
              <th className="py-1 text-right font-medium">Balances</th>
              <th className="py-1 text-right font-medium">Gross rent/yr</th>
              <th className="py-1 text-right font-medium">Fee/yr (7%)</th>
              <th className="py-1 text-center font-medium">Compliance</th>
              <th className="py-1 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner) => {
              const leases = world.state.leases.filter((l) => l.entityId === owner.id)
              const rentYr = leases.reduce((s, l) => s + l.monthlyRentCents + l.chargesCents, 0) * 12
              const issues = findingsByEntity.get(owner.id) ?? 0
              return (
                <OwnerRow
                  key={owner.id}
                  ownerId={owner.id}
                  name={owner.name}
                  units={leases.length}
                  balances={entityBalances(world.state, owner.id)}
                  rentYr={rentYr}
                  feeYr={Math.round(rentYr * (persona.managerFeePct ?? 0))}
                  issues={issues}
                  expanded={expanded === owner.id}
                  onToggle={() => setExpanded(expanded === owner.id ? null : owner.id)}
                />
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function OwnerRow(props: {
  ownerId: string
  name: string
  units: number
  balances: number
  rentYr: number
  feeYr: number
  issues: number
  expanded: boolean
  onToggle: () => void
}) {
  const { world } = useApp()
  return (
    <>
      <tr className="cursor-pointer border-t rule hover:bg-white/50" onClick={props.onToggle}>
        <td className="py-2 font-medium">{props.name}</td>
        <td className="py-2 text-right">{props.units}</td>
        <td className="py-2 text-right">{eurCompact(props.balances)}</td>
        <td className="py-2 text-right">{eurCompact(props.rentYr)}</td>
        <td className="py-2 text-right">{eurCompact(props.feeYr)}</td>
        <td className="py-2 text-center">
          {props.issues > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#B4392E]" />
              <span className="text-xs">{props.issues}</span>
            </span>
          ) : (
            <span className="inline-block h-2 w-2 rounded-full bg-[#3D6B47]" />
          )}
        </td>
        <td className="py-2 text-right text-xs text-brass">{props.expanded ? 'close' : 'drill down'}</td>
      </tr>
      {props.expanded && (
        <tr className="border-t rule bg-white/60">
          <td colSpan={7} className="px-3 py-3">
            <div className="mb-2 flex justify-end">
              <Button onClick={() => exportOwnerPack(world, props.ownerId, props.name)}>
                Export owner pack (CSV)
              </Button>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {world.state.leases
                  .filter((l) => l.entityId === props.ownerId)
                  .map((lease) => {
                    const property = world.state.persona.properties.find(
                      (p) => p.id === lease.propertyId,
                    )
                    const leaseFindings = world
                      .findings()
                      .filter((f) => f.leaseId === lease.id && f.severity !== 'info')
                    return (
                      <tr key={lease.id} className="border-t rule first:border-t-0">
                        <td className="py-1">{property?.label}, {property?.city}</td>
                        <td className="py-1">{lease.tenantNames.join(', ')}</td>
                        <td className="py-1 text-right">{eur(lease.monthlyRentCents)}/mo</td>
                        <td className="py-1 text-right">
                          deposit {eur(world.journal.balance(`liabilities:deposits_held:${lease.id}`))}
                        </td>
                        <td className="py-1">
                          {leaseFindings.map((f) => (
                            <Badge key={f.ruleId} tone={f.severity === 'violation' ? 'red' : 'brass'}>
                              {f.ruleId}
                            </Badge>
                          ))}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

function exportOwnerPack(
  world: ReturnType<typeof useApp.getState>['world'],
  ownerId: string,
  name: string,
) {
  const rows = ['date,event,memo,account,debit_eur,credit_eur']
  for (const event of world.journal.all) {
    for (const p of event.postings) {
      if (p.dims.entityId !== ownerId) continue
      rows.push(
        [
          event.date,
          event.kind,
          `"${(event.memo ?? '').replace(/"/g, "'")}"`,
          p.account,
          p.direction === 'debit' ? (p.amountCents / 100).toFixed(2) : '',
          p.direction === 'credit' ? (p.amountCents / 100).toFixed(2) : '',
        ].join(','),
      )
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `owner-pack-${name.replace(/\W+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Parse → preview (with statutory validation) → commit as ledger onboarding events. */
function RentRollImportWizard(props: { onDone: () => void }) {
  const { mutate } = useApp()
  const [csv, setCsv] = useState('')
  const [rows, setRows] = useState<RentRollRow[] | null>(null)
  const [committed, setCommitted] = useState<{ leases: number } | null>(null)

  const parse = () => {
    const lines = csv.trim().split(/\r?\n/)
    const header = lines[0].split(',').map((h) => h.trim())
    const idx = (name: string) => header.indexOf(name)
    const parsed: RentRollRow[] = lines.slice(1).map((line) => {
      const cells = line.split(',')
      return {
        owner: cells[idx('owner')],
        property: cells[idx('property')],
        city: cells[idx('city')],
        jurisdiction: cells[idx('jurisdiction')] as Jurisdiction,
        rentEur: Number(cells[idx('rent_eur')]),
        chargesEur: Number(cells[idx('charges_eur')]),
        depositEur: Number(cells[idx('deposit_eur')]),
        tenant: cells[idx('tenant')],
        furnished: cells[idx('furnished')] === 'true',
        startDate: cells[idx('start_date')],
      }
    })
    setRows(parsed)
  }

  const capExceeded = (row: RentRollRow) => {
    const months = row.jurisdiction === 'FR' ? (row.furnished ? 2 : 1) : row.jurisdiction === 'NL' ? 2 : row.jurisdiction === 'DE' ? 3 : 1
    return row.depositEur > months * row.rentEur
  }

  return (
    <Card title="Rent-roll import — one CSV, one new owner client, on the ledger">
      {!rows && !committed && (
        <div className="space-y-3">
          <textarea
            className="h-40 w-full border rule bg-white/60 p-3 font-mono text-xs"
            placeholder="owner,property,city,jurisdiction,rent_eur,charges_eur,deposit_eur,tenant,furnished,start_date"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => setCsv(rentRollFixture)}>Load Cabinet Morel fixture (40 rows)</Button>
            <Button tone="primary" onClick={parse} disabled={!csv.trim()}>
              Preview
            </Button>
          </div>
        </div>
      )}

      {rows && !committed && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">{rows.length} units</span> for{' '}
            <span className="font-medium">{rows[0]?.owner}</span> ·{' '}
            {rows.filter(capExceeded).length} row(s) exceed the statutory deposit cap and will be
            flagged post-import
          </div>
          <div className="max-h-64 overflow-y-auto border rule">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-paper">
                <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-greyx">
                  <th className="px-2 py-1 font-medium">Property</th>
                  <th className="px-2 py-1 font-medium">Tenant</th>
                  <th className="px-2 py-1 text-right font-medium">Rent</th>
                  <th className="px-2 py-1 text-right font-medium">Deposit</th>
                  <th className="px-2 py-1 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t rule">
                    <td className="px-2 py-1">{row.property}</td>
                    <td className="px-2 py-1">{row.tenant}</td>
                    <td className="px-2 py-1 text-right">{eurWhole(row.rentEur * 100)}</td>
                    <td className="px-2 py-1 text-right">{eurWhole(row.depositEur * 100)}</td>
                    <td className="px-2 py-1">
                      {capExceeded(row) && <Badge tone="red">over cap</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button
              tone="primary"
              onClick={() => {
                mutate((w) => {
                  const result = w.importRentRoll(rows)
                  setCommitted({ leases: result.leases })
                })
              }}
            >
              Commit — post {rows.length} onboarding events
            </Button>
            <Button onClick={() => setRows(null)}>Back</Button>
          </div>
        </div>
      )}

      {committed && (
        <div className="space-y-3 text-sm">
          <div>
            <Badge tone="green">imported</Badge>{' '}
            <span className="ml-2">
              {committed.leases} leases onboarded — deposits migrated into segregation, every one a
              balanced journal event. Check the Money screen.
            </span>
          </div>
          <Button onClick={props.onDone}>Done</Button>
        </div>
      )}
    </Card>
  )
}
