import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { eur, eurCompact } from '../format'
import { Badge, Button, Card } from '../components'
import { SpendDonut, TrendLine, CHART_COLORS } from '../charts'
import { spendByCategory, spendByProperty, spendOutliers, spendTrend } from '../../engine/analytics'

/** §3 · analytics-first, list-second. The list is a drill-down, not the front door. */
export default function CardSpend() {
  const { world, rev, setScreen } = useApp()
  void rev
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [locks, setLocks] = useState<Record<string, boolean>>({
    maintenance: true,
    utilities: true,
    insurance: true,
    compliance: true,
    travel: false,
    entertainment: false,
  })

  const byCategory = spendByCategory(world)
  const byProperty = spendByProperty(world, 10)
  const trend = spendTrend(world, 12)
  const outliers = spendOutliers(world)
  const totalSpend = byCategory.reduce((s, c) => s + c.amountCents, 0)
  const maxProperty = byProperty[0]?.amountCents ?? 1

  const spends = useMemo(() => {
    let list = [...world.journal.all].filter((e) => e.kind === 'card_spend').reverse()
    if (propertyFilter) list = list.filter((e) => e.postings[0].dims.propertyId === propertyFilter)
    if (categoryFilter) {
      list = list.filter(
        (e) => (e.postings[0].dims.category ?? '').replace('card:', '') === categoryFilter,
      )
    }
    return list.slice(0, 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, rev, propertyFilter, categoryFilter])

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Card & Spend</h1>
        <div className="text-sm text-greyx">
          {eurCompact(totalSpend)} routed through cards · every swipe pre-coded for the accountant
        </div>
      </div>

      <div className="grid grid-cols-6 gap-5">
        <Card title="Spend by category" className="col-span-2">
          <SpendDonut data={byCategory} />
          <table className="mt-2 w-full text-xs">
            <tbody>
              {byCategory.map((c, i) => (
                <tr key={c.category} className="border-t rule first:border-t-0">
                  <td className="py-1 capitalize">
                    <span
                      className="mr-2 inline-block h-2 w-2"
                      style={{
                        background: [CHART_COLORS.ink, CHART_COLORS.brass, CHART_COLORS.green, CHART_COLORS.brown, CHART_COLORS.grey][i % 5],
                      }}
                    />
                    {c.category}
                  </td>
                  <td className="py-1 text-right">{eurCompact(c.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Spend by property — top 10" className="col-span-2">
          <div className="space-y-1.5">
            {byProperty.map((p) => (
              <button
                key={p.propertyId}
                className="block w-full text-left text-xs hover:opacity-80"
                onClick={() => {
                  setPropertyFilter(p.propertyId)
                  setListOpen(true)
                }}
              >
                <div className="mb-0.5 flex justify-between">
                  <span className="max-w-52 truncate">{p.label}</span>
                  <span>{eurCompact(p.amountCents)}</span>
                </div>
                <div className="h-2 border rule">
                  <div
                    className="h-full bg-brass"
                    style={{ width: `${(p.amountCents / maxProperty) * 100}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Monthly spend — 12 months" className="col-span-2">
          <TrendLine data={trend.map((t) => ({ month: t.month, value: t.amountCents }))} height={200} />
        </Card>

        <Card title="Outlier flags → savings engine" className="col-span-3">
          {outliers.length === 0 && (
            <div className="text-sm text-greyx">
              No property is spending &gt;2× its trailing mean this month.
            </div>
          )}
          <table className="w-full text-sm">
            <tbody>
              {outliers.map((o) => (
                <tr key={o.propertyId} className="border-t rule first:border-t-0">
                  <td className="max-w-56 truncate py-1.5 font-medium">{o.label}</td>
                  <td className="py-1.5 capitalize text-greyx">{o.category}</td>
                  <td className="py-1.5 text-right">
                    {eur(o.lastMonthCents)}{' '}
                    <span className="text-xs text-greyx">vs {eur(o.trailingMeanCents)} avg</span>
                  </td>
                  <td className="py-1.5 text-right">
                    <Badge tone="red">{o.ratio.toFixed(1)}×</Badge>
                  </td>
                  <td className="py-1.5 text-right">
                    <Button tone="quiet" onClick={() => setScreen('savings')}>
                      renegotiate →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-[11px] text-greyx">
            rule: last month &gt; 2× trailing mean → vendor-renegotiation candidate
          </div>
        </Card>

        <Card title="Card controls" className="col-span-3">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(locks).map(([category, allowed]) => (
              <button
                key={category}
                onClick={() => setLocks({ ...locks, [category]: !allowed })}
                className={`flex items-center justify-between border rule px-3 py-2 text-sm ${allowed ? '' : 'opacity-60'}`}
              >
                <span className="capitalize">{category}</span>
                <Badge tone={allowed ? 'green' : 'red'}>{allowed ? 'allowed' : 'locked'}</Badge>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t rule pt-3 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-greyx">Budget burn</div>
              <div className="mt-1 font-semibold">
                {totalSpend > 0 ? '83%' : '—'}{' '}
                <span className="text-xs font-normal text-greyx">of monthly envelope</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-greyx">Pending approval</div>
              <div className="mt-1 font-semibold">
                2 <span className="text-xs font-normal text-greyx">swipes &gt; €500</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-greyx">Receipts missing</div>
              <div className="mt-1 font-semibold">
                3 <span className="text-xs font-normal text-greyx">older than 7 days</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <button onClick={() => setListOpen(!listOpen)} className="uppercase tracking-[0.14em]">
            Transactions — drill-down {listOpen ? '▾' : '▸'}
          </button>
        }
      >
        {listOpen && (
          <>
            <div className="mb-3 flex gap-3 text-sm">
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
              <select
                className="border rule bg-transparent px-2 py-1"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All categories</option>
                {byCategory.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {spends.map((event) => {
                  const posting = event.postings[0]
                  const [merchant, propertyLabel] = (event.memo ?? '').split(' — ')
                  return (
                    <tr key={event.id} className="border-t rule">
                      <td className="py-1.5 text-greyx">{event.date}</td>
                      <td className="py-1.5 font-medium">{merchant}</td>
                      <td className="max-w-56 truncate py-1.5">{propertyLabel}</td>
                      <td className="py-1.5">
                        <Badge tone="grey">{posting.dims.category?.replace('card:', '')}</Badge>
                      </td>
                      <td className="py-1.5 text-right">{eur(posting.amountCents)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
        {!listOpen && (
          <div className="text-sm text-greyx">
            {world.journal.all.filter((e) => e.kind === 'card_spend').length} transactions — click to
            expand, or click a bar above to land pre-filtered.
          </div>
        )}
      </Card>
    </div>
  )
}
