import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact, formatDate } from '../format'
import { Badge, Button, Card, Chevron, StatusDot, StatusTone } from '../components'
import { SeedLease } from '../../engine/seed/types'
import { Jurisdiction } from '../../engine/ledger/types'
import { calculateRevision } from '../../engine/indexation/calculator'
import { upcomingLeaseEvents, rentSparkline } from '../../engine/analytics'
import { extractLease, ExtractionResult } from '../../ai/extract'
import { Sparkline } from '../charts'
import { countryOf, regionOf } from '../regions'
import { Property } from '../../engine/seed/types'
import { Finding } from '../../engine/compliance/types'
import VerificationPanel from '../VerificationPanel'
import sampleLease from '../../fixtures/sample-lease.txt?raw'

export default function Leases() {
  const { world, rev, focus, setFocus } = useApp()
  void rev
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  // Cmd-K deep link: property → its detail card.
  useEffect(() => {
    if (focus?.propertyId) setSelectedProperty(focus.propertyId)
    if (focus) setFocus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const findings = world.findings()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Properties & Leases</h1>
        <Button tone="primary" onClick={() => setWizardOpen(!wizardOpen)}>
          {wizardOpen ? 'Close wizard' : 'New lease'}
        </Button>
      </div>

      {wizardOpen && <NewLeaseWizard onDone={() => setWizardOpen(false)} />}

      <EntityVerification />

      <RegionalList
        findings={findings}
        selectedProperty={selectedProperty}
        onSelectProperty={setSelectedProperty}
        selectedLease={selected}
        onSelectLease={setSelected}
      />
    </div>
  )
}

/** G §5: KYB on the owning entity — verification earned, shown on the profile. */
function EntityVerification() {
  const { world } = useApp()
  const entity = world.state.persona.entities[0]
  if (!entity) return null
  const record = world.verification(entity.id)
  const [open, setOpen] = useState(false)
  const kind = entity.kind === 'individual' ? 'individual' : 'company'
  return (
    <Card>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-greyx">
          Entity profile — {entity.name}
        </span>
        <span className="flex items-center gap-2 text-xs">
          {record?.status === 'verified' ? (
            <Badge tone="green">Verified</Badge>
          ) : record ? (
            <Badge tone="brass">Verification in progress</Badge>
          ) : (
            <Badge tone="grey">Not verified</Badge>
          )}
          <Chevron open={open} />
        </span>
      </button>
      {open && (
        <div className="mt-3 border-t rule pt-3">
          <VerificationPanel partyId={entity.id} name={entity.name} kind={kind} />
        </div>
      )}
    </Card>
  )
}

const ROW_CAP = 30

/**
 * G §2 + J §2.3: the grouping IS the view — country → region → city, each
 * group a clean section with a summary line and a compliance status dot
 * (the tones the old map pins carried, now legible). A property's detail
 * expands INLINE directly below its own row — never at the bottom of the
 * page. Collapsed regions render nothing and long regions cap at 30 rows,
 * so hundreds of units stay fast.
 */
function RegionalList(props: {
  findings: Finding[]
  selectedProperty: string | null
  onSelectProperty: (id: string | null) => void
  selectedLease: string | null
  onSelectLease: (id: string | null) => void
}) {
  const { world } = useApp()
  const [openRegions, setOpenRegions] = useState<Set<string> | null>(null)
  const [showAll, setShowAll] = useState<Set<string>>(new Set())

  const countries = useMemo(() => {
    const byCountry = new Map<string, Map<string, Property[]>>()
    for (const property of world.state.persona.properties) {
      const country = countryOf(property.jurisdiction)
      const region = regionOf(property.city, property.jurisdiction)
      const regions = byCountry.get(country) ?? new Map<string, Property[]>()
      regions.set(region, [...(regions.get(region) ?? []), property])
      byCountry.set(country, regions)
    }
    return [...byCountry.entries()]
      .map(([name, regions]) => ({
        name,
        regions: [...regions.entries()].sort((a, b) => b[1].length - a[1].length),
        units: [...regions.values()].reduce((s, list) => s + list.length, 0),
      }))
      .sort((a, b) => b.units - a.units)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world])

  const allRegions = countries.flatMap((c) => c.regions)

  // Small portfolios open everything; large ones open the biggest region.
  const open =
    openRegions ??
    new Set(
      (world.state.persona.properties.length <= 60 ? allRegions : allRegions.slice(0, 1)).map(
        ([name]) => name,
      ),
    )

  // Cmd-K deep link: make sure the focused property's region is open.
  useEffect(() => {
    if (!props.selectedProperty) return
    const property = world.state.persona.properties.find((p) => p.id === props.selectedProperty)
    if (!property) return
    const region = regionOf(property.city, property.jurisdiction)
    if (!open.has(region)) setOpenRegions(new Set([...open, region]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedProperty])

  const toggleRegion = (name: string) => {
    const next = new Set(open)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setOpenRegions(next)
  }

  const summarize = (properties: Property[]) => {
    const leases = world.state.leases.filter((l) => properties.some((p) => p.id === l.propertyId))
    const active = leases.filter(
      (l) => l.startDate <= world.today && (!l.moveOutDate || l.moveOutDate > world.today),
    )
    const deposits = active.reduce(
      (s, l) => s + world.journal.balance(`liabilities:deposits_held:${l.id}`),
      0,
    )
    const regionFindings = props.findings.filter(
      (f) => f.severity !== 'info' && leases.some((l) => l.id === f.leaseId),
    )
    const tone: StatusTone = regionFindings.some((f) => f.severity === 'violation')
      ? 'red'
      : regionFindings.length > 0
        ? 'amber'
        : 'green'
    return { active, deposits, openFindings: regionFindings.length, tone }
  }

  return (
    <Card>
      {countries.map((country) => {
        const countrySummary = summarize(country.regions.flatMap(([, list]) => list))
        return (
          <div key={country.name} className="border-b rule py-2 last:border-b-0">
            <div className="flex items-baseline justify-between gap-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-greyx">
                {country.name}
              </span>
              <span className="flex items-baseline gap-2 text-xs tabular-nums text-greyx">
                {country.units} unit{country.units === 1 ? '' : 's'} ·{' '}
                {countrySummary.openFindings === 0
                  ? 'clean'
                  : `${countrySummary.openFindings} open finding${countrySummary.openFindings === 1 ? '' : 's'}`}{' '}
                <StatusDot tone={countrySummary.tone} />
              </span>
            </div>
            {country.regions.map(([name, properties]) => {
              const { active, deposits, openFindings, tone } = summarize(properties)
              const isOpen = open.has(name)
              const visible = showAll.has(name) ? properties : properties.slice(0, ROW_CAP)
              return (
                <div key={name} className="border-t rule">
                  <button
                    className="flex w-full items-baseline justify-between gap-4 py-3 text-left hover:bg-white/40"
                    onClick={() => toggleRegion(name)}
                  >
                    <span className="text-sm font-semibold">
                      <span className="mr-2">
                        <Chevron open={isOpen} />
                      </span>
                      {name}
                    </span>
                    <span className="flex items-baseline gap-2 text-xs tabular-nums text-greyx">
                      <span>
                        {properties.length} unit{properties.length === 1 ? '' : 's'} ·{' '}
                        {properties.length
                          ? Math.round((active.length / properties.length) * 100)
                          : 0}
                        % occupied · {eurCompact(deposits)} held ·{' '}
                        {openFindings === 0
                          ? 'clean'
                          : `${openFindings} open finding${openFindings === 1 ? '' : 's'}`}
                      </span>
                      <StatusDot tone={tone} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-2 pl-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {visible.map((property) => (
                            <PropertyRow
                              key={property.id}
                              property={property}
                              findings={props.findings}
                              expanded={props.selectedProperty === property.id}
                              onToggle={() =>
                                props.onSelectProperty(
                                  props.selectedProperty === property.id ? null : property.id,
                                )
                              }
                              selectedLease={props.selectedLease}
                              onSelectLease={props.onSelectLease}
                            />
                          ))}
                        </tbody>
                      </table>
                      {properties.length > visible.length && (
                        <button
                          className="mt-1 text-xs text-brass hover:underline"
                          onClick={() => setShowAll(new Set([...showAll, name]))}
                        >
                          Show all {properties.length} in {name}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </Card>
  )
}

function PropertyRow(props: {
  property: Property
  findings: Finding[]
  expanded: boolean
  onToggle: () => void
  selectedLease: string | null
  onSelectLease: (id: string | null) => void
}) {
  const { world } = useApp()
  const { property } = props
  const leases = world.state.leases.filter((l) => l.propertyId === property.id)
  const active = leases.filter(
    (l) => l.startDate <= world.today && (!l.moveOutDate || l.moveOutDate > world.today),
  )
  const lease = active[0] ?? leases[leases.length - 1]
  const leaseFindings = props.findings.filter(
    (f) => f.severity !== 'info' && leases.some((l) => l.id === f.leaseId),
  )
  const dunning = lease ? world.dunningStage(lease.id) : 'current'
  return (
    <>
      <tr
        className={`cursor-pointer border-t rule hover:bg-white/50 ${props.expanded ? 'bg-white/70' : ''}`}
        onClick={props.onToggle}
      >
        <td className="py-2 font-medium">{property.label}</td>
        <td className="py-2 text-greyx">{property.city}</td>
        <td className="max-w-52 truncate py-2">
          {active.length > 0 ? active.map((l) => l.tenantNames[0]).join(', ') : 'vacant'}
        </td>
        <td className="py-2 text-right tabular-nums">
          {active[0] ? eur(active[0].monthlyRentCents) : '—'}
        </td>
        <td className="py-2 text-right">
          {lease && <Sparkline values={rentSparkline(world, { leaseId: lease.id })} />}
        </td>
        <td className="py-2 text-right">
          <span className="flex flex-wrap justify-end gap-1">
            {active.length === 0 && <Badge tone="grey">vacant</Badge>}
            {active[0]?.moveOutDate && (
              <Badge tone="brass">moving out</Badge>
            )}
            {leaseFindings.some((f) => f.severity === 'violation') && (
              <Badge tone="red">violation</Badge>
            )}
            {leaseFindings.some((f) => f.severity === 'warning') && (
              <Badge tone="brass">warning</Badge>
            )}
            {dunning !== 'current' && <Badge tone="red">{dunning.replace(/_/g, ' ')}</Badge>}
            {active[0]?.coTenants && <Badge tone="grey">flat-share</Badge>}
            {active[0] && calculateRevision(active[0]) && <Badge tone="grey">indexation</Badge>}
          </span>
        </td>
      </tr>
      {props.expanded && (
        <tr className="border-t rule bg-white/60">
          <td colSpan={6} className="px-3 py-3">
            <PropertyInlineDetail
              propertyId={property.id}
              selectedLease={props.selectedLease}
              onSelectLease={props.onSelectLease}
            />
          </td>
        </tr>
      )}
    </>
  )
}

/** The §2 inline detail card — rendered directly below the property's own row. */
function PropertyInlineDetail(props: {
  propertyId: string
  selectedLease: string | null
  onSelectLease: (id: string | null) => void
}) {
  const { world, setScreen, setFocus } = useApp()
  const property = world.state.persona.properties.find((p) => p.id === props.propertyId)
  if (!property) return null
  const leases = world.state.leases.filter((l) => l.propertyId === props.propertyId)
  const active = leases.filter(
    (l) => l.startDate <= world.today && (!l.moveOutDate || l.moveOutDate > world.today),
  )
  const deposits = leases.reduce(
    (s, l) => s + world.journal.balance(`liabilities:deposits_held:${l.id}`),
    0,
  )
  const nextEvent = upcomingLeaseEvents(world, 365).find((e) =>
    leases.some((l) => l.id === e.leaseId),
  )
  const findings = world
    .findings()
    .filter((f) => leases.some((l) => l.id === f.leaseId) && f.severity !== 'info')

  return (
    <div>
      <div className="grid grid-cols-4 gap-6 text-sm">
        <div className="space-y-2">
          <PField label="Address" value={`${property.label}, ${property.city}`} />
          <PField label="Regime" value={property.jurisdiction} />
          <PField label="Occupancy" value={active.length > 0 ? 'occupied' : 'vacant'} />
        </div>
        <div className="space-y-2">
          <PField label="Deposits held (segregated)" value={eurCompact(deposits)} />
          <PField
            label="Rent roll"
            value={`${eurCompact(active.reduce((s, l) => s + l.monthlyRentCents, 0))}/mo`}
          />
          <PField
            label="Compliance"
            value={findings.length === 0 ? 'clean' : `${findings.length} open finding(s)`}
          />
        </div>
        <div className="space-y-2">
          <PField
            label="Next lease event"
            value={
              nextEvent ? `${nextEvent.type} · ${formatDate(nextEvent.date)}` : 'none in 12 months'
            }
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            tone="quiet"
            onClick={() => {
              setFocus({ leaseId: active[0]?.id ?? leases[0]?.id, propertyId: property.id })
              setScreen('money')
            }}
          >
            Ledger →
          </Button>
          <Button
            tone="quiet"
            onClick={() => {
              setFocus({ leaseId: active[0]?.id ?? leases[0]?.id })
              setScreen('reports')
            }}
          >
            Documents →
          </Button>
        </div>
      </div>

      <div className="mt-3 border-t rule pt-2">
        {leases.map((l) => (
          <div key={l.id}>
            <button
              className="flex w-full items-center justify-between py-1 text-left text-xs hover:bg-white/50"
              onClick={() => props.onSelectLease(props.selectedLease === l.id ? null : l.id)}
            >
              <span>
                {l.tenantNames.join(', ')}
                <span className="ml-2 text-greyx">
                  {formatDate(l.startDate)}
                  {l.moveOutDate ? ` → ${formatDate(l.moveOutDate)}` : ' → current'}
                </span>
              </span>
              <span className="tabular-nums text-greyx">
                {eur(l.monthlyRentCents)}/mo <Chevron open={props.selectedLease === l.id} />
              </span>
            </button>
            {props.selectedLease === l.id && (
              <div className="mb-2">
                <LeaseDetail leaseId={l.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PField(props: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-greyx">{props.label}</span>
      <span className="text-right">{props.value}</span>
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
        <div className="space-y-2">
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

      {/* G §5: tenant identity — verified only by completing the flow. */}
      <div className="mt-4 border-t rule pt-3">
        <VerificationPanel
          partyId={`${lease.id}:tenant`}
          name={lease.tenantNames[0]}
          kind="individual"
        />
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
            <Button onClick={() => setText(sampleLease)}>Load lease on file</Button>
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
