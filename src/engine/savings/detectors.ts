import taxFeed from '../../fixtures/tax-comparables.json'
import tariffFeed from '../../fixtures/tariff-table.json'
import { mulberry32, intBetween, pick } from '../seed/rng'
import { PersonaSeed } from '../seed/types'

/**
 * Savings engine (Addendum B §5, revised by H §1): five always-on detectors
 * over the seed + curated feeds, scaled to the persona's portfolio. Every
 * opportunity carries an expected € value and a logic trail, and the queue
 * ranks by expected value — a simple, defensible ordering. No probability
 * number is shipped that cannot be defended.
 */

export type DetectorKind = 'property_tax' | 'utility' | 'vendor' | 'insurance' | 'subsidy'

export const DETECTORS: { kind: DetectorKind; label: string }[] = [
  { kind: 'property_tax', label: 'Property-tax review' },
  { kind: 'utility', label: 'Utility switching' },
  { kind: 'vendor', label: 'Vendor renegotiation' },
  { kind: 'insurance', label: 'Insurance repricing' },
  { kind: 'subsidy', label: 'Subsidy eligibility' },
]

export interface SavingsOpportunity {
  id: string
  detector: DetectorKind
  propertyId: string
  label: string
  kind: 'recurring' | 'one_off'
  /** Annual savings for recurring, total for one-off. Cents. */
  savingsCents: number
  successFeeCents: number
  detail: string
  logicTrail: string
  programRef: string
}

const RECURRING_FEE = 0.25 // of first-year savings
const ONE_OFF_FEE = 0.1
export const CAP_RATE = 0.045

/** NOI-to-asset-value bridge: recurring savings capitalized at 4.5%, rounded to €100. */
export function assetValueImpactCents(opportunity: SavingsOpportunity): number {
  if (opportunity.kind !== 'recurring') return 0
  return Math.round(opportunity.savingsCents / CAP_RATE / 10_000) * 10_000
}

export function detectOpportunities(persona: PersonaSeed): SavingsOpportunity[] {
  // A1 keeps its fixture-driven numbers — the €379.20 appeal is the +€8,400 moment.
  const out = persona.id === 'a1-meridian' ? detectA1(persona) : detectScaled(persona)
  // H §1: rank by expected € value, largest saving first.
  return out.sort((a, b) => b.savingsCents - a.savingsCents)
}

// ── A1 · fixture-feed detectors (deck-reconciled) ────────────────────────────

function detectA1(persona: PersonaSeed): SavingsOpportunity[] {
  const out: SavingsOpportunity[] = []
  const propertyIds = new Set(persona.properties.map((p) => p.id))

  for (const a of taxFeed.assessments) {
    if (!propertyIds.has(a.propertyId)) continue
    const property = persona.properties.find((p) => p.id === a.propertyId)!
    const median = taxFeed.comparables.find((c) => c.city === property.city)?.medianPerSqm
    if (!median || a.assessedPerSqm <= median * 1.15) continue
    const savings = Math.round((a.assessedPerSqm - median) * a.sqm * 100)
    out.push({
      id: `tax-appeal-${a.propertyId}`,
      detector: 'property_tax',
      propertyId: a.propertyId,
      label: 'Taxe foncière appeal',
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `Assessed €${a.assessedPerSqm.toFixed(2)}/m² vs city median €${median.toFixed(2)}/m²`,
      logicTrail: `valeur locative cadastrale €${a.assessedPerSqm.toFixed(2)}/m² vs €${median.toFixed(2)}/m² regional comparable (${a.sqm} m²) → appeal basis under CGI art. 1507`,
      programRef: 'CGI art. 1507 (réclamation)',
    })
  }

  const bestOffer = [...tariffFeed.offers].sort((a, b) => a.rate - b.rate)[0]
  const utilSavings = Math.round(
    (tariffFeed.currentRate - bestOffer.rate) * tariffFeed.estimatedAnnualKwh * 100,
  )
  out.push({
    id: 'utility-switch',
    detector: 'utility',
    propertyId: persona.properties[0].id,
    label: 'Utility switch (common areas)',
    kind: 'recurring',
    savingsCents: utilSavings,
    successFeeCents: Math.round(utilSavings * RECURRING_FEE),
    detail: `${tariffFeed.currentSupplier} → ${bestOffer.supplier}`,
    logicTrail: `tariff €${tariffFeed.currentRate}/kWh vs market €${bestOffer.rate}/kWh, same consumption band (~${tariffFeed.estimatedAnnualKwh} kWh/yr)`,
    programRef: 'Portfolio supply contract',
  })

  out.push({
    id: 'vendor-otis-fr-p1',
    detector: 'vendor',
    propertyId: 'fr-p1',
    label: 'Lift maintenance renegotiation',
    kind: 'recurring',
    savingsCents: 18_500,
    successFeeCents: Math.round(18_500 * RECURRING_FEE),
    detail: 'OTIS contract 28% above regional benchmark',
    logicTrail: 'contract €660/yr vs anonymised benchmark €475/yr for same service/region (lift, 6 floors, Paris)',
    programRef: 'Vendor benchmark feed',
  })

  const ins = tariffFeed.insurance
  const insSavings = ins.currentAnnualPremiumCents - ins.bestQuoteAnnualPremiumCents
  out.push({
    id: 'insurance-requote',
    detector: 'insurance',
    propertyId: persona.properties[0].id,
    label: 'PNO insurance requote',
    kind: 'recurring',
    savingsCents: insSavings,
    successFeeCents: Math.round(insSavings * RECURRING_FEE),
    detail: `Current €${(ins.currentAnnualPremiumCents / 100).toFixed(0)}/yr → ${ins.bestQuoteInsurer}`,
    logicTrail: `premium €${(ins.currentAnnualPremiumCents / 100).toFixed(0)} vs requote €${(ins.bestQuoteAnnualPremiumCents / 100).toFixed(0)} at renewal, equal cover`,
    programRef: 'Assurance propriétaire non-occupant',
  })

  for (const row of tariffFeed.renovationGrants.dpeByProperty) {
    if (!propertyIds.has(row.propertyId)) continue
    if (!tariffFeed.renovationGrants.eligibleDpeClasses.includes(row.dpe)) continue
    const grant = tariffFeed.renovationGrants.grantCents
    out.push({
      id: `maprimerenov-${row.propertyId}`,
      detector: 'subsidy',
      propertyId: row.propertyId,
      label: `MaPrimeRénov' grant (DPE ${row.dpe})`,
      kind: 'one_off',
      savingsCents: grant,
      successFeeCents: Math.round(grant * ONE_OFF_FEE),
      detail: `DPE class ${row.dpe} qualifies for the rénovation énergétique grant`,
      logicTrail: `EPC class ${row.dpe} + insulation work type → MaPrimeRénov' rule match (ANAH barème 2026)`,
      programRef: "MaPrimeRénov' (ANAH)",
    })
  }

  return out
}

// ── portfolio-scaled detectors (all other personas) ──────────────────────────

function hashId(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return h >>> 0
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function detectScaled(persona: PersonaSeed): SavingsOpportunity[] {
  const props = persona.properties
  if (props.length === 0) return []
  const rand = mulberry32(hashId(persona.id))
  const out: SavingsOpportunity[] = []

  const frEs = props.filter((p) => p.jurisdiction === 'FR' || p.jurisdiction === 'ES')
  const fr = props.filter((p) => p.jurisdiction === 'FR')
  const units = persona.leases.length

  const sample = <T>(pool: T[], n: number): T[] => {
    const copy = [...pool]
    const picked: T[] = []
    while (picked.length < n && copy.length > 0) {
      picked.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
    }
    return picked
  }

  // 1 · Property-tax review (FR/ES cadastral assessments vs comparables)
  for (const property of sample(frEs, clamp(Math.round(props.length * 0.007), frEs.length ? 1 : 0, 8))) {
    const savings = intBetween(rand, 300, 460) * 100
    const assessed = intBetween(rand, 26, 34)
    const median = assessed - intBetween(rand, 5, 9)
    out.push({
      id: `tax-${property.id}`,
      detector: 'property_tax',
      propertyId: property.id,
      label: `Property-tax appeal — ${property.label}`,
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `Assessment ${((assessed / median - 1) * 100).toFixed(0)}% above comparables`,
      logicTrail: `taxe foncière €${assessed}/m² vs €${median}/m² regional comparable → appeal basis`,
      programRef: property.jurisdiction === 'FR' ? 'CGI art. 1507' : 'IBI revisión catastral',
    })
  }

  // 2 · Utility switching (leases on non-optimal tariff)
  const utilityCount = clamp(Math.round(units * 0.0165), 1, 20)
  {
    const perLease = intBetween(rand, 180, 240) * 100
    const savings = perLease * utilityCount
    const property = pick(rand, props)
    out.push({
      id: `utility-${persona.id}`,
      detector: 'utility',
      propertyId: property.id,
      label: `Utility switch — ${utilityCount} lease${utilityCount > 1 ? 's' : ''} on non-optimal tariff`,
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `${utilityCount} supply points, avg €${(perLease / 100).toFixed(0)}/yr each`,
      logicTrail: `tariff €0.252/kWh vs market €0.218/kWh, same consumption band, ${utilityCount} matches`,
      programRef: 'Tariff comparison feed',
    })
  }

  // 3 · Vendor renegotiation (contracts above benchmark — fed by spend outliers)
  for (const property of sample(props, clamp(Math.round(props.length * 0.0035), 1, 5))) {
    const savings = intBetween(rand, 500, 700) * 100
    const current = intBetween(rand, 14, 22) * 100
    out.push({
      id: `vendor-${property.id}`,
      detector: 'vendor',
      propertyId: property.id,
      label: `Vendor renegotiation — ${property.label}`,
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: 'Maintenance contract above regional benchmark',
      logicTrail: `€${current}/mo vs anonymised benchmark €${current - Math.round(savings / 1200)}/mo for same service/region (spend-outlier flag)`,
      programRef: 'Vendor benchmark feed',
    })
  }

  // 4 · Insurance repricing (policies at renewal)
  const insuranceCount = clamp(Math.round(units * 0.0106), 1, 12)
  {
    const perPolicy = intBetween(rand, 120, 170) * 100
    const savings = perPolicy * insuranceCount
    const property = pick(rand, props)
    out.push({
      id: `insurance-${persona.id}`,
      detector: 'insurance',
      propertyId: property.id,
      label: `Insurance repricing — ${insuranceCount} polic${insuranceCount > 1 ? 'ies' : 'y'} at renewal`,
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `avg €${(perPolicy / 100).toFixed(0)}/yr per policy vs requote`,
      logicTrail: `premium €685 vs requote €${685 - Math.round(perPolicy / 100)} for equal cover, ${insuranceCount} renewals in window`,
      programRef: 'Broker requote feed',
    })
  }

  // 5 · Subsidy eligibility (EPC-eligible renovation grants)
  for (const property of sample(fr.length ? fr : props, clamp(Math.round(props.length * 0.0047), fr.length ? 1 : 0, 6))) {
    const grant = 400_000
    const dpe = pick(rand, ['F', 'G'])
    out.push({
      id: `subsidy-${property.id}`,
      detector: 'subsidy',
      propertyId: property.id,
      label: `Renovation grant (DPE ${dpe}) — ${property.label}`,
      kind: 'one_off',
      savingsCents: grant,
      successFeeCents: Math.round(grant * ONE_OFF_FEE),
      detail: 'EPC-eligible for energy-renovation subsidy',
      logicTrail: `EPC class ${dpe} + work type → MaPrimeRénov'/Ecobonus rule match`,
      programRef: "MaPrimeRénov' (ANAH)",
    })
  }

  return out
}

// ── engine status panel (§5) ─────────────────────────────────────────────────

export interface EngineStatus {
  detectorCount: number
  leasesScanned: number
  opportunities: number
  identifiedRecurringCents: number
  identifiedOneOffCents: number
  executedCents: number
  openCount: number
}

export function engineStatus(
  opportunities: (SavingsOpportunity & { executed: boolean })[],
  leasesScanned: number,
): EngineStatus {
  return {
    detectorCount: DETECTORS.length,
    leasesScanned,
    opportunities: opportunities.length,
    identifiedRecurringCents: opportunities
      .filter((o) => o.kind === 'recurring')
      .reduce((s, o) => s + o.savingsCents, 0),
    identifiedOneOffCents: opportunities
      .filter((o) => o.kind === 'one_off')
      .reduce((s, o) => s + o.savingsCents, 0),
    executedCents: opportunities
      .filter((o) => o.executed)
      .reduce((s, o) => s + o.savingsCents, 0),
    openCount: opportunities.filter((o) => !o.executed).length,
  }
}

/** PM view: value identified/captured per owner client — what the PM shows THEIR clients. */
export function savingsByOwner(
  persona: PersonaSeed,
  opportunities: (SavingsOpportunity & { executed: boolean })[],
): { entityId: string; name: string; identifiedCents: number; executedCents: number }[] {
  const rows = new Map<string, { identifiedCents: number; executedCents: number }>()
  for (const o of opportunities) {
    const entityId = persona.properties.find((p) => p.id === o.propertyId)?.entityId
    if (!entityId) continue
    const row = rows.get(entityId) ?? { identifiedCents: 0, executedCents: 0 }
    row.identifiedCents += o.savingsCents
    if (o.executed) row.executedCents += o.savingsCents
    rows.set(entityId, row)
  }
  return [...rows.entries()]
    .map(([entityId, v]) => ({
      entityId,
      name: persona.entities.find((e) => e.id === entityId)?.name ?? entityId,
      ...v,
    }))
    .sort((a, b) => b.identifiedCents - a.identifiedCents)
}
