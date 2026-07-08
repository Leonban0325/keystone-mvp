import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact, formatDate } from '../format'
import { Badge, Button, Card, toast } from '../components'
import { JournalEvent } from '../../engine/ledger/types'
import { addMonths } from '../../engine/compliance/dates'
import { moneyRollup, RollupLevel } from '../../engine/analytics'

/** Kinds that depict money movement — these rows click through to the rails screen. */
const RAIL_KINDS = new Set([
  'transfer_intent',
  'transfer_settlement',
  'transfer_compensation',
  'deposit_collected',
  'owner_distribution',
])

const KIND_LABELS: Record<string, string> = {
  rent_due: 'Rent due',
  transfer_intent: 'SDD intent',
  transfer_settlement: 'SDD settlement',
  transfer_compensation: 'R-transaction',
  saas_fee: 'SaaS fee',
  saas_fee_flat: 'SaaS fee (flat mode)',
  manager_fee: 'Manager fee',
  yield_accrual: 'Yield accrual',
  card_spend: 'Card spend',
  interchange_income: 'Interchange',
  owner_distribution: 'Owner distribution',
  deposit_collected: 'Deposit collected',
  deposit_returned: 'Deposit returned',
  reserve_funding: 'Reserve funding',
  capital_in: 'Capital in',
  remediation_refund_excess: 'Remediation: refund',
  savings_success_fee: 'Savings success fee',
}

interface Crumb {
  label: string
  level: RollupLevel
  parentId?: string
}

export default function Money() {
  const { world, rev, mutate, focus, setFocus, setScreen } = useApp()
  const [kindFilter, setKindFilter] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [leaseFilter, setLeaseFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [waterfallProperty, setWaterfallProperty] = useState(
    world.state.persona.properties[0]?.id ?? '',
  )

  // §4 roll-up levels: default depends on role; deep links land pre-drilled.
  const role = world.state.persona.role
  const [trail, setTrail] = useState<Crumb[]>(() => {
    if (focus?.entityId) {
      const name = world.state.persona.entities.find((e) => e.id === focus.entityId)?.name ?? 'owner'
      return [
        { label: 'Portfolio', level: 'portfolio' },
        { label: name, level: 'property', parentId: focus.entityId },
      ]
    }
    if (role === 'owner') return [{ label: 'By lease', level: 'lease' }]
    return [{ label: 'Portfolio', level: 'portfolio' }]
  })

  useEffect(() => {
    if (focus?.leaseId) setLeaseFilter(focus.leaseId)
    if (focus) setFocus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = trail[trail.length - 1]
  const rollupRows = useMemo(
    () => moneyRollup(world, current.level, current.parentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, rev, current.level, current.parentId],
  )

  const events = useMemo(() => {
    let list = [...world.journal.all].reverse()
    if (kindFilter) list = list.filter((e) => e.kind === kindFilter)
    if (propertyFilter) {
      list = list.filter((e) => e.postings.some((p) => p.dims.propertyId === propertyFilter))
    }
    if (leaseFilter) {
      list = list.filter((e) => e.postings.some((p) => p.dims.leaseId === leaseFilter))
    }
    return list.slice(0, 120)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, rev, kindFilter, propertyFilter, leaseFilter])

  const kinds = [...new Set(world.journal.all.map((e) => e.kind))]
  const pending = world.state.pendingIntents

  // §3: the row that just posted highlights briefly — cause and effect visible.
  const journalLen = world.journal.all.length
  const prevLenRef = useRef(journalLen)
  const newIds = useMemo(() => {
    const prev = prevLenRef.current
    prevLenRef.current = journalLen
    if (journalLen > prev) {
      return new Set(world.journal.all.slice(prev).map((e) => e.id))
    }
    return new Set<string>()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalLen])

  const openRails = (event: JournalEvent) => {
    setFocus({ eventId: event.id })
    setScreen('rails')
  }

  const drillInto = (rowId: string, childLevel: RollupLevel) => {
    const label = rollupRows.find((r) => r.id === rowId)?.label ?? rowId
    setTrail([...trail, { label, level: childLevel, parentId: rowId === 'portfolio' ? undefined : rowId }])
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Money</h1>

      {/* §4 · roll-up before drill-down */}
      <Card title="Roll-up — the journal folded by dimension">
        <div className="mb-3 flex items-center gap-1 text-sm">
          {trail.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-greyx">›</span>}
              <button
                className={i === trail.length - 1 ? 'font-semibold' : 'text-brass hover:underline'}
                onClick={() => setTrail(trail.slice(0, i + 1))}
              >
                {crumb.label}
              </button>
            </span>
          ))}
          <span className="ml-auto text-xs text-greyx">
            {current.level === 'portfolio'
              ? 'click a row to fold by owner'
              : current.level === 'owner'
                ? 'click an owner to see their properties'
                : current.level === 'property'
                  ? 'click a property to see its leases'
                  : 'click a lease to filter the journal below'}
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-paper">
              <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
                <th className="py-1 font-medium">{current.level}</th>
                <th className="py-1 text-right font-medium">In</th>
                <th className="py-1 text-right font-medium">Out</th>
                <th className="py-1 text-right font-medium">Net</th>
                <th className="py-1 text-right font-medium">Balance held</th>
              </tr>
            </thead>
            <tbody>
              {rollupRows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t rule hover:bg-white/50"
                  onClick={() =>
                    row.children
                      ? drillInto(row.id, row.children)
                      : setLeaseFilter(leaseFilter === row.id ? '' : row.id)
                  }
                >
                  <td className="max-w-72 truncate py-1.5 font-medium">
                    {row.label}
                    {!row.children && leaseFilter === row.id && (
                      <Badge tone="brass"> journal filtered</Badge>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{eurCompact(row.inCents)}</td>
                  <td className="py-1.5 text-right">{eurCompact(row.outCents)}</td>
                  <td className={`py-1.5 text-right ${row.netCents < 0 ? 'text-[#B4392E]' : ''}`}>
                    {eurCompact(row.netCents)}
                  </td>
                  <td className="py-1.5 text-right">{eurCompact(row.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card title="Payout waterfall — last month">
          <select
            className="mb-3 border rule bg-transparent px-2 py-1 text-sm"
            value={waterfallProperty}
            onChange={(e) => setWaterfallProperty(e.target.value)}
          >
            {world.state.persona.properties.slice(0, 200).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Waterfall propertyId={waterfallProperty} />
        </Card>

        <Card title={`Pending settlements — ${pending.length}`}>
          {pending.length === 0 && (
            <div className="text-sm text-greyx">
              Nothing in flight. Collections present on each lease's payment day.
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {pending.slice(0, 30).map((p) => (
                  <tr key={p.intent.id} className="border-t rule first:border-t-0">
                    <td className="py-2">{p.intent.memo}</td>
                    <td className="py-2 text-right">{eur(p.intent.postings[0].amountCents)}</td>
                    <td className="py-2 text-right">
                      <span className="mr-2 text-xs text-greyx">
                        settles {formatDate(p.settleOn)}
                      </span>
                      <Button
                        onClick={() => {
                          mutate((w) => w.resolvePendingNow(p.intent.id, 'settle'))
                          toast('Settled — settlement leg posted and reconciled.')
                        }}
                      >
                        Settle now
                      </Button>{' '}
                      <Button
                        onClick={() => {
                          mutate((w) => w.resolvePendingNow(p.intent.id, 'fail'))
                          toast('R-transaction — compensating entry posted.', 'info')
                        }}
                      >
                        Force R
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title={`Journal — ${world.journal.all.length} events, every euro dimensioned`}>
        <div className="mb-3 flex gap-3 text-sm">
          <select
            className="border rule bg-transparent px-2 py-1"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="">All kinds</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k] ?? k}
              </option>
            ))}
          </select>
          <select
            className="border rule bg-transparent px-2 py-1"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="">All properties</option>
            {world.state.persona.properties.slice(0, 200).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {leaseFilter && (
            <Button tone="quiet" onClick={() => setLeaseFilter('')}>
              lease: {leaseFilter} ✕
            </Button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Event</th>
              <th className="py-1 font-medium">Memo</th>
              <th className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                expanded={expanded === event.id}
                onToggle={() => setExpanded(expanded === event.id ? null : event.id)}
                justPosted={newIds.has(event.id)}
                onRails={RAIL_KINDS.has(event.kind) ? () => openRails(event) : undefined}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function EventRow(props: {
  event: JournalEvent
  expanded: boolean
  onToggle: () => void
  justPosted?: boolean
  onRails?: () => void
}) {
  const { event } = props
  const total = event.postings
    .filter((p) => p.direction === 'debit')
    .reduce((sum, p) => sum + p.amountCents, 0)
  return (
    <>
      <tr
        className={`cursor-pointer border-t rule hover:bg-white/50 ${props.justPosted ? 'row-flash' : ''}`}
        onClick={props.onToggle}
      >
        <td className="py-1.5 text-greyx">{event.date}</td>
        <td className="py-1.5">
          {KIND_LABELS[event.kind] ?? event.kind}
          {event.phase && (
            <span className="ml-2">
              <Badge tone={event.phase === 'compensation' ? 'red' : 'grey'}>{event.phase}</Badge>
            </span>
          )}
        </td>
        <td className="py-1.5 text-greyx">{event.memo ?? '—'}</td>
        <td className="py-1.5 text-right">
          {eur(total)}
          {props.onRails && (
            <button
              className="ml-2 text-xs text-brass hover:underline"
              title="View processing detail"
              onClick={(e) => {
                e.stopPropagation()
                props.onRails!()
              }}
            >
              processing →
            </button>
          )}
        </td>
      </tr>
      {props.expanded && (
        <tr className="border-t rule bg-white/60">
          <td colSpan={4} className="px-3 py-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-greyx">
                  <th className="font-medium">Account</th>
                  <th className="font-medium">Dims</th>
                  <th className="text-right font-medium">Debit</th>
                  <th className="text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {event.postings.map((p, i) => (
                  <tr key={i}>
                    <td className="py-0.5 font-mono">{p.account}</td>
                    <td className="py-0.5 text-greyx">
                      {[p.dims.propertyId, p.dims.leaseId, p.dims.category]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className="py-0.5 text-right">
                      {p.direction === 'debit' ? eur(p.amountCents) : ''}
                    </td>
                    <td className="py-0.5 text-right">
                      {p.direction === 'credit' ? eur(p.amountCents) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

/** Rent in → manager fee → SaaS fee → vendor spend (card) → owner, from last month's journal. */
function Waterfall(props: { propertyId: string }) {
  const { world } = useApp()
  const monthStart = addMonths(world.today.slice(0, 8) + '01', -1)
  const monthEnd = world.today.slice(0, 8) + '01'
  const lease = world.state.leases.find((l) => l.propertyId === props.propertyId)
  const managerPct = world.state.persona.managerFeePct ?? 0

  let rentIn = 0
  let saas = 0
  let vendor = 0
  for (const event of world.journal.all) {
    if (event.date < monthStart || event.date >= monthEnd) continue
    const touches = event.postings.some((p) => p.dims.propertyId === props.propertyId)
    if (event.kind === 'rent_due' && touches) {
      rentIn += event.postings[0].amountCents
    }
    if ((event.kind === 'saas_fee' || event.kind === 'saas_fee_flat') && lease) {
      saas += event.postings.find((p) => p.dims.leaseId === lease.id)?.amountCents ?? 0
    }
    if (event.kind === 'card_spend' && touches) {
      vendor += event.postings[0].amountCents
    }
  }
  const managerFee = Math.round(rentIn * managerPct)
  const owner = Math.max(0, rentIn - saas - vendor - managerFee)
  const total = Math.max(1, rentIn)
  const width = (v: number) => `${Math.max(1, (v / total) * 100)}%`

  const parts = [
    { label: 'Rent in', value: rentIn, color: 'var(--ink)' },
    ...(managerFee > 0 ? [{ label: `Manager fee (${(managerPct * 100).toFixed(0)}%)`, value: managerFee, color: '#6E7680' }] : []),
    { label: 'SaaS fee', value: saas, color: 'var(--brass)' },
    { label: 'Vendors (card)', value: vendor, color: '#8A6D3B' },
    { label: 'To owner', value: owner, color: '#3D6B47' },
  ]

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden border rule">
        {parts.slice(1).map((p) => (
          <div key={p.label} style={{ width: width(p.value), background: p.color }} title={p.label} />
        ))}
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {parts.map((p) => (
            <tr key={p.label} className="border-t rule first:border-t-0">
              <td className="py-1">
                <span className="mr-2 inline-block h-2 w-2" style={{ background: p.color }} />
                {p.label}
              </td>
              <td className="py-1 text-right">{eur(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
