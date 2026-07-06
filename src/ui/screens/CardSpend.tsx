import { useState } from 'react'
import { useApp } from '../store'
import { eur } from '../format'
import { Badge, Card } from '../components'

export default function CardSpend() {
  const { world, rev } = useApp()
  void rev
  const [locks, setLocks] = useState<Record<string, boolean>>({
    maintenance: true,
    utilities: true,
    insurance: true,
    compliance: true,
    travel: false,
    entertainment: false,
  })

  const spends = [...world.journal.all].filter((e) => e.kind === 'card_spend').reverse()

  const byProperty = new Map<string, number>()
  for (const event of spends) {
    const pid = event.postings[0].dims.propertyId ?? '—'
    byProperty.set(pid, (byProperty.get(pid) ?? 0) + event.postings[0].amountCents)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Card & Spend</h1>
        <div className="text-sm text-greyx">
          every swipe lands on the right property, pre-coded for the accountant
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card title="Per-property routing" className="col-span-1">
          <table className="w-full text-sm">
            <tbody>
              {[...byProperty.entries()].map(([pid, total]) => (
                <tr key={pid} className="border-t rule first:border-t-0">
                  <td className="py-1.5">
                    {world.state.persona.properties.find((p) => p.id === pid)?.label ?? pid}
                  </td>
                  <td className="py-1.5 text-right">{eur(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Category locks" className="col-span-2">
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
          <p className="mt-3 text-xs text-greyx">
            Merchant-category controls per card — a property card can buy a boiler part, not a
            holiday. (Visual demo; rules enforce at the simulated processor.)
          </p>
        </Card>
      </div>

      <Card title={`Transactions — ${spends.length}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-greyx">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Merchant</th>
              <th className="py-1 font-medium">Property</th>
              <th className="py-1 font-medium">Category</th>
              <th className="py-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {spends.slice(0, 60).map((event) => {
              const posting = event.postings[0]
              const [merchant, propertyLabel] = (event.memo ?? '').split(' — ')
              return (
                <tr key={event.id} className="border-t rule">
                  <td className="py-1.5 text-greyx">{event.date}</td>
                  <td className="py-1.5 font-medium">{merchant}</td>
                  <td className="py-1.5">{propertyLabel}</td>
                  <td className="py-1.5">
                    <Badge tone="grey">{posting.dims.category?.replace('card:', '')}</Badge>
                  </td>
                  <td className="py-1.5 text-right">{eur(posting.amountCents)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
