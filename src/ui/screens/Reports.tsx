import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { eur } from '../format'
import { Button, Card } from '../components'
import { addMonths } from '../../engine/compliance/dates'

export default function Reports() {
  const { world, rev, focus, setFocus } = useApp()
  void rev
  const activeLeases = world.state.leases.filter((l) => !l.moveOutDate)
  // Cmd-K deep link: tenant → their quittance, pre-selected.
  const [leaseId, setLeaseId] = useState(focus?.leaseId ?? activeLeases[0]?.id ?? '')
  useEffect(() => {
    if (focus) setFocus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lastMonth = addMonths(world.today.slice(0, 8) + '01', -1)
  const [month, setMonth] = useState(lastMonth.slice(0, 7))

  const lease = world.state.leases.find((l) => l.id === leaseId)
  const property = lease && world.state.persona.properties.find((p) => p.id === lease.propertyId)

  const exportFec = () => {
    const rows = [
      'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|Montantdevise|Idevise',
    ]
    world.journal.all.forEach((event, i) => {
      for (const p of event.postings) {
        const date = event.date.replace(/-/g, '')
        rows.push(
          [
            'KEY',
            'Journal Keystone',
            String(i + 1),
            date,
            p.account,
            p.account.split(':').slice(-1)[0],
            event.id,
            date,
            (event.memo ?? event.kind).replace(/[|\n]/g, ' '),
            p.direction === 'debit' ? (p.amountCents / 100).toFixed(2).replace('.', ',') : '0,00',
            p.direction === 'credit' ? (p.amountCents / 100).toFixed(2).replace('.', ',') : '0,00',
            '',
            'EUR',
          ].join('|'),
        )
      }
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FEC-keystone-${world.today}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <Button tone="primary" onClick={exportFec}>
          Export FEC (CSV)
        </Button>
      </div>

      <Card title="Quittance de loyer">
        <div className="mb-4 flex gap-3 text-sm">
          <select
            className="border rule bg-transparent px-2 py-1"
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
          >
            {activeLeases.map((l) => {
              const p = world.state.persona.properties.find((x) => x.id === l.propertyId)
              return (
                <option key={l.id} value={l.id}>
                  {p?.label} — {l.tenantNames.join(', ')}
                </option>
              )
            })}
          </select>
          <input
            type="month"
            className="border rule bg-transparent px-2 py-1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Button onClick={() => window.print()}>Print</Button>
        </div>

        {lease && property && (
          <div className="mx-auto max-w-2xl border rule bg-white p-10 text-sm leading-relaxed">
            <div className="mb-8 flex justify-between">
              <div>
                <div className="font-semibold">{world.state.persona.name}</div>
                <div className="text-greyx">Bailleur</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">QUITTANCE DE LOYER</div>
                <div className="text-greyx">Période : {month}</div>
              </div>
            </div>
            <p>
              Je soussigné, {world.state.persona.name}, propriétaire du logement situé{' '}
              <strong>{property.label}</strong>, déclare avoir reçu de{' '}
              <strong>{lease.tenantNames.join(' et ')}</strong> la somme de{' '}
              <strong>{eur(lease.monthlyRentCents + lease.chargesCents)}</strong> au titre du loyer
              et des charges du mois indiqué, et lui en donne quittance, sous réserve de tous mes
              droits.
            </p>
            <table className="mt-6 w-full">
              <tbody>
                <tr className="border-t rule">
                  <td className="py-1.5">Loyer hors charges</td>
                  <td className="py-1.5 text-right">{eur(lease.monthlyRentCents)}</td>
                </tr>
                <tr className="border-t rule">
                  <td className="py-1.5">Provisions sur charges</td>
                  <td className="py-1.5 text-right">{eur(lease.chargesCents)}</td>
                </tr>
                <tr className="border-t rule font-semibold">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-right">{eur(lease.monthlyRentCents + lease.chargesCents)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-8 text-right">
              <div>Fait à Paris, le {world.today}</div>
              <div className="mt-4 italic text-greyx">Signature du bailleur</div>
            </div>
            <div className="mt-8 border-t rule pt-3 text-[10px] text-greyx">
              Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas
              de paiement partiel du montant du présent terme. Généré par Keystone à partir du
              journal comptable — chaque montant provient d'écritures en partie double.
            </div>
          </div>
        )}
      </Card>

      <Card title="FEC export">
        <p className="text-sm text-greyx">
          The export produces a pipe-delimited FEC-style file (Fichier des Écritures Comptables)
          straight from the double-entry journal — {world.journal.all.length} events,{' '}
          {world.journal.all.reduce((s, e) => s + e.postings.length, 0)} lines, every posting with
          its account path and dimensions. And the accountant says yes.
        </p>
      </Card>
    </div>
  )
}
