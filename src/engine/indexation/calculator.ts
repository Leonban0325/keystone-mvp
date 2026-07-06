import tables from './tables.json'
import { SeedLease } from '../seed/types'

export interface IndexTable {
  label: string
  unit: 'quarter' | 'year'
  rows: { period: string; value: number }[]
}

export const INDEX_TABLES = tables as Record<'IRL' | 'CPI_NL' | 'ISTAT', IndexTable>

export interface Revision {
  index: string
  indexLabel: string
  basePeriod: string
  baseValue: number
  currentPeriod: string
  currentValue: number
  oldRentCents: number
  /** Permitted new rent (rounded to the cent). */
  newRentCents: number
  increaseCents: number
  increasePct: number
  noticeText: string
}

/**
 * Permitted rent after indexation: rent × current-index ÷ base-index.
 * The base value is frozen on the lease at signature/last revision.
 */
export function calculateRevision(lease: SeedLease): Revision | null {
  if (!lease.indexation) return null
  const table = INDEX_TABLES[lease.indexation.index]
  const current = table.rows[table.rows.length - 1]
  const base = lease.indexation.baseValue
  const newRentCents = Math.round((lease.monthlyRentCents * current.value) / base)
  const increaseCents = newRentCents - lease.monthlyRentCents
  const basePeriod =
    table.rows.find((r) => r.value === base)?.period ?? `${base} (contract base)`

  return {
    index: lease.indexation.index,
    indexLabel: table.label,
    basePeriod,
    baseValue: base,
    currentPeriod: current.period,
    currentValue: current.value,
    oldRentCents: lease.monthlyRentCents,
    newRentCents,
    increaseCents,
    increasePct: (increaseCents / lease.monthlyRentCents) * 100,
    noticeText: noticeLetter(lease, base, current, newRentCents),
  }
}

function noticeLetter(
  lease: SeedLease,
  baseValue: number,
  current: { period: string; value: number },
  newRentCents: number,
): string {
  const eur = (c: number) => (c / 100).toFixed(2)
  return [
    `Objet : Révision annuelle du loyer — bail ${lease.id}`,
    ``,
    `Madame, Monsieur ${lease.tenantNames[0]},`,
    ``,
    `Conformément à la clause d'indexation de votre bail, le loyer est révisé`,
    `selon l'évolution de l'indice de référence (${current.period} : ${current.value} ; base : ${baseValue}).`,
    ``,
    `Loyer actuel : ${eur(lease.monthlyRentCents)} € hors charges`,
    `Nouveau loyer : ${eur(newRentCents)} € hors charges`,
    ``,
    `Cette révision prend effet à la prochaine échéance. Les charges restent inchangées.`,
    ``,
    `Cordialement,`,
    `La gérance`,
  ].join('\n')
}
