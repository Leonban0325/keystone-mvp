import { mulberry32 } from '../seed/rng'
import { parseISO } from '../compliance/dates'
import { Jurisdiction } from '../ledger/types'
import type { PersonaSeed, SeedLease } from '../seed/types'

/**
 * Data realism (Addendum D2). Realistic ≠ random: model the actual behaviour
 * of rental cash, then add controlled noise. Everything here is keyed by
 * stable strings (lease id + month, property id + purpose) through a seeded
 * PRNG, so the "randomness" is reproducible — identical every run, identical
 * after a snapshot restore — but reads as organic. Never Math.random().
 */

// ── Keyed deterministic randomness ───────────────────────────────────────────

export function hashString(...parts: (string | number)[]): number {
  let h = 0x811c9dc5
  for (const part of parts) {
    for (const ch of String(part)) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 0x01000193)
    }
    h ^= 0x2e
  }
  return h >>> 0
}

/** One-shot PRNG stream for a stable key. */
export function keyedRand(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(...parts))
}

// ── Distributions ────────────────────────────────────────────────────────────

/** Poisson draw (Knuth) — repair arrivals. */
export function poisson(rand: () => number, lambda: number): number {
  if (lambda <= 0) return 0
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k += 1
    p *= rand()
  } while (p > limit)
  return k - 1
}

/** Log-normal cents around a median — the long tail real maintenance follows. */
export function logNormalCents(rand: () => number, medianCents: number, sigma: number): number {
  const u1 = Math.max(rand(), 1e-9)
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(500, Math.round(medianCents * Math.exp(sigma * z)))
}

// ── Calendar texture ─────────────────────────────────────────────────────────

/** SEPA settlement avoids non-banking days: Sat/Sun roll to Monday. */
export function rollToBusinessDay(date: string): string {
  const d = parseISO(date)
  const dow = d.getUTCDay()
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2)
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Business-hours-weighted time of day for card swipes. */
export function timeOfDay(rand: () => number): string {
  // 80% 08:00–18:00, the rest evenings; minutes non-round.
  const hour = rand() < 0.8 ? 8 + Math.floor(rand() * 10) : 18 + Math.floor(rand() * 4)
  const minute = Math.floor(rand() * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// ── Rent amounts (§2.1) — non-round, per-city bands ──────────────────────────

/** Draw a realistic rent: odd euro endings (€1,187 / €943.50), never €X00/€X50. */
export function nonRoundAmountCents(rand: () => number, minCents: number, maxCents: number): number {
  let euros = Math.round((minCents + rand() * (maxCents - minCents)) / 100)
  if (euros % 50 === 0) euros += 1 + Math.floor(rand() * 9) // kill the round ending
  const halfEuro = rand() < 0.3 ? 50 : 0
  return euros * 100 + halfEuro
}

/** Charges provision: separate, smaller, non-round (§2.1). */
export function chargesCents(rand: () => number): number {
  return nonRoundAmountCents(rand, 6_000, 18_000)
}

// ── Payment timing personalities (§2.2) ──────────────────────────────────────

export type TimingProfile = 'standard' | 'tight' | 'social'
export type Punctuality = 'early' | 'prompt' | 'slow' | 'chronic'

const PAYMENT_DAYS = [1, 1, 1, 1, 2, 3, 3, 5, 5, 10]

/** Due day is set at signing (1st/3rd/5th/10th…), not all the 1st. */
export function paymentDayFor(lease: SeedLease): number {
  if (lease.paymentDay) return lease.paymentDay
  const rand = keyedRand(lease.id, 'payday')
  return PAYMENT_DAYS[Math.floor(rand() * PAYMENT_DAYS.length)]
}

/**
 * A tenant's punctuality is drawn ONCE per lease and reused all year — some
 * tenants are *always* a bit late. This is what makes the data feel like
 * real people rather than re-rolled noise.
 */
export function punctualityFor(lease: SeedLease, profile: TimingProfile): Punctuality {
  if (lease.punctuality) return lease.punctuality
  const r = keyedRand(lease.id, 'punctuality')()
  if (profile === 'tight') {
    // Institutional BTR: professionally managed, tighter timing.
    return r < 0.3 ? 'early' : r < 0.96 ? 'prompt' : 'slow'
  }
  if (r < 0.18) return 'early'
  if (r < 0.88) return 'prompt'
  if (r < 0.96) return 'slow'
  return 'chronic'
}

/** Settlement lag vs due date for one lease-month; personality + small jitter. */
export function settlementOffsetDays(lease: SeedLease, month: string, profile: TimingProfile): number {
  const jitter = keyedRand(lease.id, month, 'lag')
  switch (punctualityFor(lease, profile)) {
    case 'early':
      return jitter() < 0.7 ? 0 : 1
    case 'prompt':
      return Math.floor(jitter() * 3) // 0–2: normal SDD settlement lag
    case 'slow':
      return 3 + Math.floor(jitter() * 6) // 3–8: chronically slightly late
    case 'chronic':
      return 4 + Math.floor(jitter() * 6) // 4–9, every single month
  }
}

/**
 * ~a few % of collections R-fail organically (insufficient funds, mandate
 * issues) and most recover next cycle — the sweep collects the full open
 * receivable, so an R in month M self-heals in month M+1 unless scripted.
 */
export function organicRFails(lease: SeedLease, month: string, profile: TimingProfile): boolean {
  const rate = profile === 'tight' ? 0.006 : profile === 'social' ? 0.035 : 0.018
  return keyedRand(lease.id, month, 'rfail')() < rate
}

const R_REASONS: [string, number][] = [
  ['insufficient funds (AM04)', 0.68],
  ['mandate cancelled by debtor (MD07)', 0.14],
  ['refusal by debtor (MS02)', 0.12],
  ['account closed (AC04)', 0.06],
]

/** Varied R-transaction reasons (§4) — deterministic per lease-month. */
export function rReason(leaseId: string, month: string): string {
  let r = keyedRand(leaseId, month, 'rreason')()
  for (const [reason, weight] of R_REASONS) {
    r -= weight
    if (r <= 0) return reason
  }
  return R_REASONS[0][0]
}

export function timingProfileOf(persona: PersonaSeed): TimingProfile {
  return persona.timingProfile ?? 'standard'
}

// ── Merchant catalogs (§5) — country-appropriate, plausible ─────────────────

export interface Merchant {
  name: string
  category: 'maintenance' | 'utilities' | 'insurance' | 'compliance' | 'services'
}

const MERCHANTS: Record<string, Record<string, string[]>> = {
  FR: {
    diy: ['Leroy Merlin', 'Castorama', 'Brico Dépôt', 'Point.P'],
    trades: ['Plomberie Roche & Fils', 'Élec Réseau Ardoin', 'Chauffage Durand SARL', 'Peinture Meunier', 'Serrurerie Blanchet', 'Toitures Lemaire'],
    utilities: ['ENGIE', 'EDF', 'Veolia Eau', 'TotalEnergies'],
    insurance: ['AXA Assurances', 'MAIF', 'Allianz France'],
    services: ['ONET Propreté', 'Samsic Facility', 'OTIS Ascenseurs', 'Bureau Veritas'],
  },
  NL: {
    diy: ['Gamma', 'Praxis', 'Karwei'],
    trades: ['Loodgietersbedrijf Van Dam', 'Installatiebedrijf De Groot', 'Schildersbedrijf Mulder', 'Dakdekkersbedrijf Smit'],
    utilities: ['Eneco', 'Vattenfall', 'Waternet'],
    insurance: ['Centraal Beheer', 'Nationale-Nederlanden'],
    services: ['CSU Schoonmaak', 'Kone Liften', 'Kiwa Inspectie'],
  },
  ES: {
    diy: ['Leroy Merlin España', 'Bauhaus', 'BricoMart'],
    trades: ['Fontanería Soler', 'Electricidad Ferrer', 'Reformas Iglesias', 'Pinturas Casals'],
    utilities: ['Endesa', 'Iberdrola', 'Aigües de Barcelona'],
    insurance: ['Mapfre', 'Catalana Occidente'],
    services: ['Limpiezas Colomer', 'Zardoya Otis', 'OCA ITV Inspección'],
  },
  DE: {
    diy: ['Bauhaus', 'OBI', 'Hornbach'],
    trades: ['Sanitär Huber GmbH', 'Elektro Vogel', 'Malermeister Brandt', 'Heizungsbau Keller'],
    utilities: ['E.ON', 'Stadtwerke München', 'Vattenfall Berlin'],
    insurance: ['Allianz', 'HUK-Coburg'],
    services: ['Gebäudereinigung Weiss', 'TÜV Süd', 'Kone Aufzüge'],
  },
}

export function merchantFor(
  rand: () => number,
  jurisdiction: Jurisdiction | string,
  pool: 'diy' | 'trades' | 'utilities' | 'insurance' | 'services',
): string {
  const country = MERCHANTS[jurisdiction] ?? MERCHANTS.FR
  const names = country[pool] ?? country.trades
  return names[Math.floor(rand() * names.length)]
}
