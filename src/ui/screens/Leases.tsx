import { useState } from 'react'
import { useApp } from '../store'
import { eur, formatDate } from '../format'
import { Badge, Button, Card } from '../components'
import { SeedLease } from '../../engine/seed/types'
import { Jurisdiction } from '../../engine/ledger/types'
import { calculateRevision } from '../../engine/indexation/calculator'
import { extractLease, ExtractionResult } from '../../ai/extract'
import sampleLease from '../../fixtures/sample-lease.txt?raw'

export default function Leases() {
  const { world, rev } = useApp()
  void rev
  const [selected, setSelected] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const findings = world.findings()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Properties & Leases</h1>
        <Button tone="primary" onClick={() => setWizardOpen(!wizardOpen)}>
          {wizardOpen ? 'Close wizard' : 'New lease'}
        </Button>
      </div>

      {wizardOpen && <NewLeaseWizard onDone={() => setWizardOpen(false)} />}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Property</th>
              <th className="py-1 font-medium">Regime</th>
              <th className="py-1 font-medium">Tenant(s)</th>
              <th className="py-1 text-right font-medium">Rent</th>
              <th className="py-1 text-right font-medium">Deposit held</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {world.state.leases.map((lease) => {
              const property = world.state.persona.properties.find(
                (p) => p.id === lease.propertyId,
              )
              const leaseFindings = findings.filter((f) => f.leaseId === lease.id)
              const dunning = world.dunningStage(lease.id)
              return (
                <tr
                  key={lease.id}
                  className={`cursor-pointer border-t rule hover:bg-white/50 ${selected === lease.id ? 'bg-white/70' : ''}`}
                  onClick={() => setSelected(selected === lease.id ? null : lease.id)}
                >
                  <td className="py-2 font-medium">{property?.label ?? lease.propertyId}</td>
                  <td className="py-2">
                    <Badge tone="ink">{lease.jurisdiction}</Badge>{' '}
                    <span className="text-xs text-greyx">
                      {lease.furnished ? 'furnished' : 'unfurnished'}
                    </span>
                  </td>
                  <td className="py-2">{lease.tenantNames.join(', ')}</td>
                  <td className="py-2 text-right">{eur(lease.monthlyRentCents)}</td>
                  <td className="py-2 text-right">
                    {eur(world.journal.balance(`liabilities:deposits_held:${lease.id}`))}
                  </td>
                  <td className="py-2">
                    <span className="flex flex-wrap gap-1">
                      {lease.moveOutDate && <Badge tone="brass">moving out</Badge>}
                      {leaseFindings.some((f) => f.severity === 'violation') && (
                        <Badge tone="red">violation</Badge>
                      )}
                      {leaseFindings.some((f) => f.severity === 'warning') && (
                        <Badge tone="brass">warning</Badge>
                      )}
                      {dunning !== 'current' && <Badge tone="red">{dunning.replace(/_/g, ' ')}</Badge>}
                      {lease.coTenants && <Badge tone="grey">flat-share</Badge>}
                      {calculateRevision(lease) && <Badge tone="grey">indexation</Badge>}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {selected && <LeaseDetail leaseId={selected} />}
    </div>
  )
}

function LeaseDetail(props: { leaseId: string }) {
  const { world } = useApp()
  const lease = world.state.leases.find((l) => l.id === props.leaseId)
  if (!lease) return null
  const property = world.state.persona.properties.find((p) => p.id === lease.propertyId)
  const revision = calculateRevision(lease)
  const findings = world.findings().filter((f) => f.leaseId === lease.id)

  return (
    <Card title={`Lease detail — ${property?.label}`}>
      <div className="grid grid-cols-3 gap-6 text-sm">
        <div className="space-y-1.5">
          <Field label="Regime" value={`${lease.jurisdiction} · ${lease.furnished ? 'furnished' : 'unfurnished'}`} />
          <Field label="Start date" value={formatDate(lease.startDate)} />
          {lease.moveOutDate && <Field label="Move-out" value={formatDate(lease.moveOutDate)} />}
          <Field label="Rent excl. charges" value={eur(lease.monthlyRentCents)} />
          <Field label="Charges" value={eur(lease.chargesCents)} />
          <Field
            label="Deposit held"
            value={eur(world.journal.balance(`liabilities:deposits_held:${lease.id}`))}
          />
          {lease.jurisdiction === 'ES' && (
            <Field
              label="Fianza lodgement"
              value={lease.lodgementCertificate ?? 'MISSING'}
            />
          )}
          {lease.coTenants && (
            <Field
              label="Co-tenants"
              value={lease.coTenants.map((c) => `${c.name} (${eur(c.shareCents)})`).join(' · ')}
            />
          )}
        </div>

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">
            Open findings
          </div>
          {findings.length === 0 && <div className="text-greyx">Clean.</div>}
          <ul className="space-y-2">
            {findings.map((f) => (
              <li key={f.ruleId}>
                <span className="font-medium">{f.ruleId}</span>
                <div className="text-xs text-greyx">{f.message}</div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">Indexation</div>
          {!revision && <div className="text-greyx">No indexation clause on this lease.</div>}
          {revision && (
            <div className="space-y-2">
              <div>
                {revision.index} {revision.basePeriod} → {revision.currentPeriod} (
                {revision.baseValue} → {revision.currentValue})
              </div>
              <div>
                {eur(revision.oldRentCents)} → <span className="font-semibold">{eur(revision.newRentCents)}</span>{' '}
                <span className="text-xs text-greyx">
                  (+{eur(revision.increaseCents)}, {revision.increasePct.toFixed(2)}%)
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-brass">Notice letter</summary>
                <pre className="mt-2 whitespace-pre-wrap border rule bg-white/60 p-3 text-xs">
                  {revision.noticeText}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function Field(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-greyx">{props.label}</span>
      <span className="text-right">{props.value}</span>
    </div>
  )
}

/**
 * New-lease wizard: paste/load lease text → AI extraction (live or canned) →
 * confirm fields (money fields require explicit confirmation — suggest-only).
 */
function NewLeaseWizard(props: { onDone: () => void }) {
  const { world, mutate } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [propertyId, setPropertyId] = useState(world.state.persona.properties[0]?.id ?? '')

  const runExtraction = async () => {
    setBusy(true)
    const extraction = await extractLease(text)
    setResult(extraction)
    setConfirmed({})
    setBusy(false)
  }

  const moneyFields = ['monthly_rent_excl_charges', 'charges', 'deposit_amount']
  const allConfirmed = moneyFields.every((f) => confirmed[f])

  const createLease = () => {
    if (!result) return
    const f = result.fields
    const property = world.state.persona.properties.find((p) => p.id === propertyId)!
    const lease: SeedLease = {
      id: `lease-new-${Date.now().toString(36)}`,
      propertyId,
      entityId: property.entityId,
      jurisdiction: (f.jurisdiction as Jurisdiction) ?? property.jurisdiction,
      furnished: f.furnished,
      monthlyRentCents: Math.round(f.monthly_rent_excl_charges * 100),
      chargesCents: Math.round(f.charges * 100),
      depositCents: Math.round(f.deposit_amount * 100),
      startDate: f.start_date,
      tenantNames: f.parties
        .filter((p) => p.toLowerCase().includes('locataire') || f.parties.length === 1)
        .map((p) => p.replace(/\s*\((bailleur|locataire)\)\s*/i, ''))
        .filter((p) => !p.toLowerCase().includes('sci')),
      indexation: f.indexation_clause
        ? { index: 'IRL', baseValue: 148.97, lastRevised: f.start_date }
        : undefined,
    }
    mutate((w) => w.addLease(lease))
    props.onDone()
  }

  return (
    <Card title="New lease — AI extraction with offline fallback">
      {!result && (
        <div className="space-y-3">
          <textarea
            className="h-48 w-full border rule bg-white/60 p-3 font-mono text-xs"
            placeholder="Paste the lease text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => setText(sampleLease)}>Load sample lease</Button>
            <Button tone="primary" onClick={runExtraction} disabled={!text || busy}>
              {busy ? 'Extracting…' : 'Extract fields'}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge tone={result.source === 'live' ? 'green' : 'grey'}>
              {result.source === 'live' ? 'Live API extraction' : 'Canned extraction (offline)'}
            </Badge>
            <span className="text-xs text-greyx">
              Money fields are suggest-only — confirm each before the lease can be created.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <ExtractedField label="Parties" value={result.fields.parties.join(' · ')} confidence={result.confidence.parties} />
            <ExtractedField label="Jurisdiction" value={result.fields.jurisdiction} confidence={result.confidence.jurisdiction} />
            <ExtractedField label="Furnished" value={result.fields.furnished ? 'yes' : 'no'} confidence={result.confidence.furnished} />
            <ExtractedField label="Start date" value={result.fields.start_date} confidence={result.confidence.start_date} />
            <ExtractedField label="Indexation clause" value={result.fields.indexation_clause ? 'yes (IRL)' : 'no'} confidence={result.confidence.indexation_clause} />
            {moneyFields.map((field) => (
              <ExtractedField
                key={field}
                label={field.replace(/_/g, ' ')}
                value={eur(Math.round((result.fields[field as keyof typeof result.fields] as number) * 100))}
                confidence={result.confidence[field]}
                confirm={{
                  checked: !!confirmed[field],
                  onChange: (v) => setConfirmed({ ...confirmed, [field]: v }),
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              className="border rule bg-transparent px-2 py-1 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              {world.state.persona.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  attach to: {p.label}
                </option>
              ))}
            </select>
            <Button tone="primary" disabled={!allConfirmed} onClick={createLease}
              title={allConfirmed ? undefined : 'Confirm all money fields first'}>
              Create lease & collect deposit
            </Button>
            <Button onClick={() => setResult(null)}>Back</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ExtractedField(props: {
  label: string
  value: string
  confidence?: number
  confirm?: { checked: boolean; onChange: (v: boolean) => void }
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b rule py-1">
      <span className="text-greyx">{props.label}</span>
      <span className="flex items-center gap-2">
        <span>{props.value}</span>
        {props.confidence !== undefined && (
          <Badge tone={props.confidence > 0.9 ? 'green' : 'brass'}>
            {(props.confidence * 100).toFixed(0)}%
          </Badge>
        )}
        {props.confirm && (
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={props.confirm.checked}
              onChange={(e) => props.confirm!.onChange(e.target.checked)}
            />
            confirm
          </label>
        )}
      </span>
    </div>
  )
}
