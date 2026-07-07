import type { DemoWorld } from './world'
import { ACCOUNTS } from './ledger/types'
import { daysBetween } from './compliance/dates'

/**
 * Natural-language portfolio query (Addendum D §4.2), deterministic half.
 * The AI (or the canned matcher) translates a question into this structured
 * query; execution is plain code over the dataset. AI never touches the
 * numbers — it only writes the WHERE clause.
 */

export interface PortfolioQuery {
  where?: {
    jurisdiction?: string
    city?: string
    ownerName?: string
    tenantName?: string
    depositOverCap?: boolean
    arrearsOverDays?: number
    inDunning?: boolean
    movingOutWithinDays?: number
  }
  select?: 'leases' | 'count' | 'arrears_total'
}

export interface QueryRow {
  lease: string
  property: string
  city: string
  owner: string
  tenant: string
  jurisdiction: string
  rentEur: number
  depositHeldEur: number
  arrearsEur: number
  daysInArrears: number | null
}

export interface QueryResult {
  rows: QueryRow[]
  summary: string
}

export function runQuery(world: DemoWorld, query: PortfolioQuery): QueryResult {
  const persona = world.state.persona
  const findings = world.findings()
  const overCapLeases = new Set(
    findings.filter((f) => f.ruleId.includes('CAP') && f.severity === 'violation').map((f) => f.leaseId),
  )

  const rows: QueryRow[] = []
  for (const lease of world.state.leases) {
    const where = query.where ?? {}
    if (where.jurisdiction && lease.jurisdiction !== where.jurisdiction.toUpperCase()) continue
    const property = persona.properties.find((p) => p.id === lease.propertyId)
    if (where.city && !property?.city.toLowerCase().includes(where.city.toLowerCase())) continue
    const owner = persona.entities.find((e) => e.id === lease.entityId)
    if (where.ownerName && !owner?.name.toLowerCase().includes(where.ownerName.toLowerCase()))
      continue
    if (
      where.tenantName &&
      !lease.tenantNames.some((t) => t.toLowerCase().includes(where.tenantName!.toLowerCase()))
    )
      continue
    if (where.depositOverCap && !overCapLeases.has(lease.id)) continue

    const arrears = world.journal.balance(ACCOUNTS.rentReceivable(lease.id))
    const since = world.state.arrearsSince.get(lease.id)
    const daysInArrears = since ? daysBetween(since, world.today) : null
    if (where.arrearsOverDays !== undefined) {
      if (!since || arrears <= 0 || daysBetween(since, world.today) < where.arrearsOverDays) continue
    }
    if (where.inDunning && world.dunningStage(lease.id) === 'current') continue
    if (where.movingOutWithinDays !== undefined) {
      if (
        !lease.moveOutDate ||
        lease.moveOutDate < world.today ||
        daysBetween(world.today, lease.moveOutDate) > where.movingOutWithinDays
      )
        continue
    }

    rows.push({
      lease: lease.id,
      property: property?.label ?? lease.propertyId,
      city: property?.city ?? '',
      owner: owner?.name ?? lease.entityId,
      tenant: lease.tenantNames.join(', '),
      jurisdiction: lease.jurisdiction,
      rentEur: lease.monthlyRentCents / 100,
      depositHeldEur: world.journal.balance(ACCOUNTS.depositsHeld(lease.id)) / 100,
      arrearsEur: arrears / 100,
      daysInArrears,
    })
  }

  const arrearsTotal = rows.reduce((s, r) => s + r.arrearsEur, 0)
  const summary =
    query.select === 'count'
      ? `${rows.length} lease(s) match.`
      : query.select === 'arrears_total'
        ? `${rows.length} lease(s) match · €${arrearsTotal.toFixed(2)} in arrears.`
        : `${rows.length} lease(s) match${arrearsTotal > 0 ? ` · €${arrearsTotal.toFixed(2)} in arrears` : ''}.`
  return { rows: rows.slice(0, 50), summary }
}

/**
 * Canned NL → DSL matcher: the fallback when the AI API is off. Also the
 * guaranteed path for the ≥3 seeded demo questions.
 */
export function cannedParse(question: string): PortfolioQuery | null {
  const q = question.toLowerCase()
  const where: NonNullable<PortfolioQuery['where']> = {}
  let matched = false

  if (/french|france|\bfr\b/.test(q)) ((where.jurisdiction = 'FR'), (matched = true))
  if (/dutch|netherlands|\bnl\b/.test(q)) ((where.jurisdiction = 'NL'), (matched = true))
  if (/spanish|spain|\bes\b/.test(q)) ((where.jurisdiction = 'ES'), (matched = true))
  if (/german|germany|\bde\b/.test(q)) ((where.jurisdiction = 'DE'), (matched = true))

  if (/(deposit|caution|kaution|fianza).*(above|over|exceed|cap)|over.?cap/.test(q)) {
    where.depositOverCap = true
    matched = true
  }
  const arrearsDays = q.match(/arrears?[^0-9]*(\d+)\s*days?|(\d+)\s*days?[^a-z]*arrears?/)
  if (arrearsDays) {
    where.arrearsOverDays = Number(arrearsDays[1] ?? arrearsDays[2])
    matched = true
  } else if (/arrears|overdue|late|behind on rent/.test(q)) {
    where.arrearsOverDays = 0
    matched = true
  }
  if (/dunning|reminder|formal notice/.test(q)) ((where.inDunning = true), (matched = true))
  if (/moving out|move-?outs?|leaving/.test(q)) ((where.movingOutWithinDays = 60), (matched = true))

  const owner = q.match(/owner\s+([\p{L}'-]+)/u)
  if (owner) ((where.ownerName = owner[1]), (matched = true))
  const tenant = q.match(/tenant\s+([\p{L}'-]+)/u)
  if (tenant) ((where.tenantName = tenant[1]), (matched = true))

  if (!matched) return null
  return {
    where,
    select: /how many|count/.test(q) ? 'count' : /total|sum/.test(q) ? 'arrears_total' : 'leases',
  }
}
