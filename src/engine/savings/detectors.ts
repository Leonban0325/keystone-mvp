import taxFeed from '../../fixtures/tax-comparables.json'
import tariffFeed from '../../fixtures/tariff-table.json'
import { PersonaSeed } from '../seed/types'

/**
 * Savings detectors: real detector functions over the seed + bundled
 * simulated feeds. Each opportunity carries the expected € and the success
 * fee Keystone books on execution.
 */

export interface SavingsOpportunity {
  id: string
  propertyId: string
  label: string
  kind: 'recurring' | 'one_off'
  /** Annual savings for recurring, total for one-off. Cents. */
  savingsCents: number
  successFeeCents: number
  detail: string
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
  const out: SavingsOpportunity[] = []
  const propertyIds = new Set(persona.properties.map((p) => p.id))

  // 1 · Taxe foncière appeal: assessment far above the city median.
  for (const a of taxFeed.assessments) {
    if (!propertyIds.has(a.propertyId)) continue
    const property = persona.properties.find((p) => p.id === a.propertyId)!
    const median = taxFeed.comparables.find((c) => c.city === property.city)?.medianPerSqm
    if (!median || a.assessedPerSqm <= median * 1.15) continue
    const savings = Math.round((a.assessedPerSqm - median) * a.sqm * 100)
    out.push({
      id: `tax-appeal-${a.propertyId}`,
      propertyId: a.propertyId,
      label: 'Taxe foncière appeal',
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `Assessed at €${a.assessedPerSqm.toFixed(2)}/m² vs city median €${median.toFixed(2)}/m² — contest the valeur locative cadastrale`,
      programRef: 'CGI art. 1507 (réclamation)',
    })
  }

  // 2 · Utility switch on common-area supply.
  const bestOffer = [...tariffFeed.offers].sort((a, b) => a.rate - b.rate)[0]
  if (bestOffer.rate < tariffFeed.currentRate && propertyIds.size > 0) {
    const savings = Math.round(
      (tariffFeed.currentRate - bestOffer.rate) * tariffFeed.estimatedAnnualKwh * 100,
    )
    out.push({
      id: 'utility-switch',
      propertyId: persona.properties[0].id,
      label: 'Utility switch (common areas)',
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `${tariffFeed.currentSupplier} €${tariffFeed.currentRate}/kWh → ${bestOffer.supplier} €${bestOffer.rate}/kWh on ~${tariffFeed.estimatedAnnualKwh} kWh/yr`,
      programRef: 'Portfolio supply contract',
    })
  }

  // 3 · Insurance requote.
  const ins = tariffFeed.insurance
  if (ins.bestQuoteAnnualPremiumCents < ins.currentAnnualPremiumCents) {
    const savings = ins.currentAnnualPremiumCents - ins.bestQuoteAnnualPremiumCents
    out.push({
      id: 'insurance-requote',
      propertyId: persona.properties[0].id,
      label: 'PNO insurance requote',
      kind: 'recurring',
      savingsCents: savings,
      successFeeCents: Math.round(savings * RECURRING_FEE),
      detail: `Current premium €${(ins.currentAnnualPremiumCents / 100).toFixed(0)}/yr → ${ins.bestQuoteInsurer} €${(ins.bestQuoteAnnualPremiumCents / 100).toFixed(0)}/yr`,
      programRef: 'Assurance propriétaire non-occupant',
    })
  }

  // 4 · MaPrimeRénov' eligibility on poor-DPE units.
  for (const row of tariffFeed.renovationGrants.dpeByProperty) {
    if (!propertyIds.has(row.propertyId)) continue
    if (!tariffFeed.renovationGrants.eligibleDpeClasses.includes(row.dpe)) continue
    const grant = tariffFeed.renovationGrants.grantCents
    out.push({
      id: `maprimerenov-${row.propertyId}`,
      propertyId: row.propertyId,
      label: `MaPrimeRénov' grant (DPE ${row.dpe})`,
      kind: 'one_off',
      savingsCents: grant,
      successFeeCents: Math.round(grant * ONE_OFF_FEE),
      detail: `DPE class ${row.dpe} qualifies for the rénovation énergétique grant`,
      programRef: "MaPrimeRénov' (ANAH)",
    })
  }

  return out
}
