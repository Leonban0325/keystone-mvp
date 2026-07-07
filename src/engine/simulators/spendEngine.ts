import { posting } from '../ledger/journal'
import { ACCOUNTS, Jurisdiction } from '../ledger/types'
import { INTERCHANGE_RATE } from './economics'
import {
  hashString,
  keyedRand,
  logNormalCents,
  merchantFor,
  nonRoundAmountCents,
  poisson,
  timeOfDay,
} from './realism'
import type { Property } from '../seed/types'
import type { WorldState } from '../world'

/**
 * Vendor & operating spend (Addendum D2 §3/§5): lumpy and seasonal, not a
 * flat monthly line. Recurring contracts land as their real shape (insurance
 * one annual hit, boiler service quarterly, cleaning monthly ± variance);
 * repairs arrive Poisson with log-normal amounts and a winter heating
 * cluster; utilities carry seasonal shape plus 1–2 deliberate anomalies the
 * spend detector catches; one or two capex spikes a year. Every amount is
 * non-round, every merchant country-appropriate, every swipe timestamped.
 * All keyed randomness — identical every run.
 *
 * The persona's `cardMonthlySpendCents` is the monthly *envelope*; streams
 * are budgeted as fractions of it, with the noise living inside the
 * aggregate. Revenue reconciliation is unaffected: interchange follows the
 * actual spend and the §2.4 residual booking absorbs the drift.
 */

const BUDGET = {
  utilities: 0.26,
  services: 0.14, // cleaning / common areas — monthly, small variance
  boiler: 0.08, // heating service contract — quarterly
  insurance: 0.12, // annual premium — one larger hit
  repairs: 0.3, // Poisson arrivals, log-normal amounts
  capex: 0.1, // 1–2 genuine spikes per year
}

/** Heating/electricity higher in winter; estimated reads drift around that. */
const UTILITY_SEASON: Record<string, number> = {
  '01': 1.42, '02': 1.38, '03': 1.15, '04': 0.95, '05': 0.8, '06': 0.68,
  '07': 0.62, '08': 0.65, '09': 0.85, '10': 1.1, '11': 1.3, '12': 1.45,
}

/** Repairs cluster Oct–Feb (heating) and around summer turnover. */
const REPAIR_SEASON: Record<string, number> = {
  '01': 1.4, '02': 1.3, '03': 1.0, '04': 0.85, '05': 0.8, '06': 0.95,
  '07': 1.05, '08': 1.0, '09': 0.85, '10': 1.15, '11': 1.3, '12': 1.35,
}

interface SpendItem {
  day: number
  merchant: string
  category: string
  amountCents: number
  note?: string
}

// Typical real-world bill sizes (cents). When the per-unit budget is smaller
// than a typical bill, a hash-chosen SUBSET of properties bills each cycle
// (participation < 1) instead of smearing tiny fake €6 amounts everywhere.
const TYPICAL = { utilities: 8_500, services: 6_500, boiler: 18_000, insurance: 32_000 }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * The month's spend schedule for one property — computed lazily per
 * (property, month) from keyed PRNGs, then posted on the matching tick days.
 */
function monthSchedule(s: WorldState, property: Property, month: string): SpendItem[] {
  const units = Math.max(1, s.persona.properties.length)
  const envelope = s.persona.cardMonthlySpendCents / units // per-unit monthly budget
  if (envelope <= 0) return []
  const mm = month.slice(5, 7)
  const j: Jurisdiction | string = property.jurisdiction
  const items: SpendItem[] = []

  // One property deliberately runs hot on maintenance (feeds the outlier flag
  // and the vendor-renegotiation savings opportunity).
  const heavyIndex = hashString(s.persona.id, 'heavy') % units
  const isHeavy = s.persona.properties[heavyIndex]?.id === property.id

  // Utilities — monthly, seasonal, consumption-driven variance (§3.3).
  {
    const budget = envelope * BUDGET.utilities
    const participates =
      keyedRand(property.id, month, 'util-p')() < clamp(budget / TYPICAL.utilities, 0, 1)
    // The engineered anomaly: an estimated-read spike in the last full month
    // before the epoch, on a hash-chosen property — it exists IN THE DATA.
    const anomalyIndex = hashString(s.persona.id, 'anomaly') % units
    const isAnomaly =
      s.persona.properties[anomalyIndex]?.id === property.id && month === anomalyMonth(s)
    if (participates || isAnomaly) {
      const rand = keyedRand(property.id, month, 'util')
      let amount = Math.round(
        Math.max(TYPICAL.utilities, budget) * UTILITY_SEASON[mm] * (0.9 + rand() * 0.2),
      )
      // The estimated-read annual catch-up bill: big enough that the property's
      // month lands >2× its trailing mean, so the outlier flag (and from it
      // the savings engine) finds it in the data — not hard-coded anywhere.
      if (isAnomaly) amount = Math.round(amount * 6)
      items.push({
        day: 4 + (hashString(property.id, 'utilday') % 6),
        merchant: merchantFor(rand, j, 'utilities'),
        category: 'utilities',
        amountCents: nonRound(amount, rand),
        note: isAnomaly ? 'estimated read — flagged' : undefined,
      })
    }
  }

  // Cleaning / common areas — monthly, stable ± small variance.
  {
    const budget = envelope * BUDGET.services * (isHeavy ? 1.4 : 1)
    if (keyedRand(property.id, month, 'svc-p')() < clamp(budget / TYPICAL.services, 0, 1)) {
      const rand = keyedRand(property.id, month, 'svc')
      const amount = Math.round(Math.max(TYPICAL.services, budget) * (0.92 + rand() * 0.16))
      items.push({
        day: 9 + (hashString(property.id, 'svcday') % 5),
        merchant: merchantFor(rand, j, 'services'),
        category: 'services',
        amountCents: nonRound(amount, rand),
      })
    }
  }

  // Boiler / heating service contract — quarterly, offset per property.
  {
    const phase = hashString(property.id, 'boilerphase') % 3
    const budget = envelope * BUDGET.boiler * 3
    if (
      (Number(mm) - 1) % 3 === phase &&
      keyedRand(property.id, month, 'boiler-p')() < clamp(budget / TYPICAL.boiler, 0, 1)
    ) {
      const rand = keyedRand(property.id, month, 'boiler')
      const amount = Math.round(Math.max(TYPICAL.boiler, budget) * (0.95 + rand() * 0.1))
      items.push({
        day: 14 + (hashString(property.id, 'boilerday') % 8),
        merchant: merchantFor(rand, j, 'trades'),
        category: 'maintenance',
        amountCents: nonRound(amount, rand),
        note: 'service contract',
      })
    }
  }

  // Insurance premium — one annual hit in a per-property fixed month (§3.1).
  {
    const renewalMonth = 1 + (hashString(property.id, 'insmonth') % 12)
    const budget = envelope * BUDGET.insurance * 12
    if (
      Number(mm) === renewalMonth &&
      keyedRand(property.id, 'ins-p')() < clamp(budget / TYPICAL.insurance, 0, 1)
    ) {
      const rand = keyedRand(property.id, month, 'ins')
      const amount = Math.round(Math.max(TYPICAL.insurance, budget) * (0.9 + rand() * 0.2))
      items.push({
        day: 2 + (hashString(property.id, 'insday') % 10),
        merchant: merchantFor(rand, j, 'insurance'),
        category: 'insurance',
        amountCents: nonRound(amount, rand),
        note: 'annual premium',
      })
    }
  }

  // Repairs & maintenance — Poisson arrivals, log-normal long tail (§3.2).
  {
    const rand = keyedRand(property.id, month, 'repairs')
    const budgetAnnual = envelope * BUDGET.repairs * 12
    // Realistic arrival rate (0.3–0.9 events/unit/yr); amounts absorb the rest
    // of the budget so a high-opex portfolio has bigger jobs, not fake counts.
    const lambdaAnnual = clamp(budgetAnnual / 26_400, 0.3, 0.9) * (isHeavy ? 1.9 : 1)
    const median = Math.max(9_000, Math.round(budgetAnnual / lambdaAnnual / 1.65))
    const count = poisson(rand, (lambdaAnnual / 12) * REPAIR_SEASON[mm])
    for (let k = 0; k < count; k += 1) {
      const large = rand() < 0.06
      const amount = large
        ? nonRoundAmountCents(rand, 150_000, 420_000) // the boiler/roof event
        : logNormalCents(rand, median, 1.0)
      const winter = Number(mm) >= 10 || Number(mm) <= 2
      items.push({
        day: 1 + Math.floor(rand() * 27),
        merchant: merchantFor(rand, j, rand() < 0.45 ? 'diy' : 'trades'),
        category: 'maintenance',
        amountCents: amount,
        note: large ? 'major repair' : winter && rand() < 0.6 ? 'heating call-out' : undefined,
      })
    }
  }

  // Capex — 1–2 renovation spikes a year across the portfolio (§3.2).
  {
    const capexCount = 1 + (hashString(s.persona.id, 'capexn') % 2)
    for (let c = 0; c < capexCount; c += 1) {
      const propIndex = hashString(s.persona.id, 'capexprop', c) % units
      const capexMonth = 1 + (hashString(s.persona.id, 'capexmonth', c) % 12)
      if (s.persona.properties[propIndex]?.id !== property.id || Number(mm) !== capexMonth) continue
      const rand = keyedRand(property.id, month, 'capex', c)
      items.push({
        day: 6 + Math.floor(rand() * 18),
        merchant: merchantFor(rand, j, 'trades'),
        category: 'maintenance',
        amountCents: nonRoundAmountCents(rand, 300_000, 800_000),
        note: 'renovation — capex',
      })
    }
  }

  return items
}

/** Last full month before the persona's epoch — where the anomaly lands. */
function anomalyMonth(s: WorldState): string {
  const [y, m] = s.persona.epoch.slice(0, 7).split('-').map(Number)
  const prev = m === 1 ? [y - 1, 12] : [y, m - 1]
  return `${prev[0]}-${String(prev[1]).padStart(2, '0')}`
}

function nonRound(amountCents: number, rand: () => number): number {
  // Merchant-appropriate cents: €47.80, €212.35 — never €X00.00.
  const cents = [80, 35, 20, 90, 45, 60, 15, 70][Math.floor(rand() * 8)]
  return Math.max(500, Math.floor(amountCents / 100) * 100 + cents)
}

// Schedules are pure functions of (property, month) — memoize per world so
// the daily driver doesn't recompute 850 portfolios × 365 days of PRNG draws.
const scheduleCache = new WeakMap<WorldState, Map<string, SpendItem[]>>()

function cachedSchedule(s: WorldState, property: Property, month: string): SpendItem[] {
  let cache = scheduleCache.get(s)
  if (!cache) {
    cache = new Map()
    scheduleCache.set(s, cache)
  }
  const key = `${property.id}|${month}`
  let items = cache.get(key)
  if (!items) {
    items = monthSchedule(s, property, month)
    cache.set(key, items)
  }
  return items
}

/**
 * Daily driver: post this day's scheduled spend for every property. Card
 * spend is owner money — it reduces owner_payable and leaves operating as
 * cash. Interchange accrues at month end over the month's actual spend.
 */
export function runSpendEngine(s: WorldState, day: string): void {
  if (s.persona.cardMonthlySpendCents <= 0) return
  const month = day.slice(0, 7)
  const dayOfMonth = Number(day.slice(8))

  for (const property of s.persona.properties) {
    for (const item of cachedSchedule(s, property, month)) {
      if (item.day !== dayOfMonth) continue
      const rand = keyedRand(property.id, month, item.merchant, item.amountCents)
      s.journal.append({
        id: s.journal.nextId(),
        date: day,
        kind: 'card_spend',
        memo: `${item.merchant} — ${property.label}${item.note ? ` · ${item.note}` : ''}`,
        meta: { time: timeOfDay(rand) },
        postings: [
          posting(ACCOUNTS.ownerPayable(property.entityId), 'debit', item.amountCents, {
            entityId: property.entityId,
            propertyId: property.id,
            category: `card:${item.category}`,
          }),
          posting(ACCOUNTS.operating, 'credit', item.amountCents, {
            propertyId: property.id,
            category: 'card',
          }),
        ],
      })
    }
  }
}

/** Month-end interchange on the month's ACTUAL card spend (kept in sync with the lumpy feed). */
export function postMonthlyInterchange(s: WorldState, day: string): void {
  const month = day.slice(0, 7)
  let total = 0
  for (const event of s.journal.all) {
    if (event.kind === 'card_spend' && event.date.slice(0, 7) === month) {
      total += event.postings[0].amountCents
    }
  }
  const interchange = Math.round(total * INTERCHANGE_RATE)
  if (interchange <= 0) return
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
