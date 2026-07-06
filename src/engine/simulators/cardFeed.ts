import { posting } from '../ledger/journal'
import { ACCOUNTS } from '../ledger/types'
import { INTERCHANGE_RATE } from './economics'
import { pick } from '../seed/rng'
import type { WorldState } from '../world'

const VENDORS = [
  { name: 'Leroy Merlin', category: 'maintenance' },
  { name: 'ENGIE', category: 'utilities' },
  { name: 'AXA Assurances', category: 'insurance' },
  { name: 'Veolia Eau', category: 'utilities' },
  { name: 'Castorama', category: 'maintenance' },
  { name: 'OTIS Ascenseurs', category: 'maintenance' },
  { name: 'Bureau Veritas', category: 'compliance' },
] as const

/**
 * Monthly card feed: one spend transaction per property, amounts jittered
 * deterministically but summing exactly to the persona's monthly spend so the
 * interchange line reconciles to the deck. Spend is owner money: it reduces
 * owner_payable and leaves operating as cash.
 */
export function postMonthlyCardSpend(s: WorldState, day: string): void {
  const props = s.persona.properties
  const total = s.persona.cardMonthlySpendCents
  if (total <= 0 || props.length === 0) return

  const base = Math.floor(total / props.length)
  let remaining = total
  props.forEach((prop, i) => {
    const left = props.length - 1 - i
    let amount: number
    if (left === 0) {
      amount = remaining
    } else {
      const jitter = Math.floor(base * 0.3 * (s.rand() - 0.5))
      // Never overdraw what the remaining properties minimally need (1¢ each).
      amount = Math.max(1, Math.min(base + jitter, remaining - left))
    }
    if (amount <= 0) return
    remaining -= amount
    const vendor = pick(s.rand, VENDORS)
    s.journal.append({
      id: s.journal.nextId(),
      date: day,
      kind: 'card_spend',
      memo: `${vendor.name} — ${prop.label}`,
      postings: [
        posting(ACCOUNTS.ownerPayable(prop.entityId), 'debit', amount, {
          entityId: prop.entityId,
          propertyId: prop.id,
          category: `card:${vendor.category}`,
        }),
        posting(ACCOUNTS.operating, 'credit', amount, { propertyId: prop.id, category: 'card' }),
      ],
    })
  })

  const interchange = Math.round(total * INTERCHANGE_RATE)
  if (interchange > 0) {
    s.journal.append({
      id: s.journal.nextId(),
      date: day,
      kind: 'interchange_income',
      memo: 'Scheme interchange on monthly card spend',
      postings: [
        posting(ACCOUNTS.operating, 'debit', interchange, { category: 'interchange' }),
        posting(ACCOUNTS.feeIncome('interchange'), 'credit', interchange, { category: 'interchange' }),
      ],
    })
  }
}
