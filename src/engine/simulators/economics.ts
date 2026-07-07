/**
 * Yield-split economics. All rates are decimals (0.0225 = 2.25%).
 *
 * At the base DFR of 2.25% on €125,000 under management the model reconciles
 * to the deck exactly:
 *   owner yield   = 60% of DFR            → 1.35%   → €1,687.50/yr ≈ €169/unit
 *   bank share    = max(12 bps floor, 13% of DFR) → 29.25 bps → €365.63/yr
 *   Keystone NIM  = DFR − owner − bank    → 60.75 bps → €759.38/yr ≈ €75.94/unit
 *   revenue/unit  = SaaS €84 + NIM €75.94 + interchange €12 ≈ €171.94 ≈ €172
 *
 * Failsafe: when Keystone's take drops below 25 bps the pricing flips to
 * flat-fee mode (visible banner; SaaS billed at the flat rate instead).
 */

export const OWNER_SHARE_OF_DFR = 0.6
export const BANK_SHARE_OF_DFR = 0.13
export const BANK_FLOOR = 0.0012 // 12 bps
export const KEYSTONE_MIN_TAKE = 0.0025 // 25 bps failsafe threshold
export const BASE_DFR = 0.0225

/** €/unit/month SaaS pricing ladder (cents). */
export const PRICING = {
  basic: 700,
  pro: 1200,
  enterprise: 500,
  network: 600,
  /** Flat-fee mode billed when the failsafe fires. */
  flatFee: 1500,
} as const

export type PricingTier = keyof Omit<typeof PRICING, 'flatFee'>

export interface YieldSplit {
  ownerRate: number
  bankRate: number
  keystoneRate: number
  /** True when Keystone take < 25 bps → flat-fee mode. */
  failsafe: boolean
}

export function splitYield(dfr: number): YieldSplit {
  const ownerRate = dfr * OWNER_SHARE_OF_DFR
  const bankRate = Math.max(BANK_FLOOR, dfr * BANK_SHARE_OF_DFR)
  const keystoneRate = Math.max(0, dfr - ownerRate - bankRate)
  return { ownerRate, bankRate, keystoneRate, failsafe: keystoneRate < KEYSTONE_MIN_TAKE }
}

/** Cents of yield for one month on a cent balance at an annual rate. */
export function monthlyYieldCents(balanceCents: number, annualRate: number): number {
  return Math.round((balanceCents * annualRate) / 12)
}

/** Interchange rate on card spend. */
export const INTERCHANGE_RATE = 0.003

/**
 * Historical DFR path for the curated 12-month dataset (Addendum D §2.1):
 * the ECB easing cycle from mid-2025 into 2026, ending at the 2.25% base.
 * Keys are months; the demo clock applies each step on its month start.
 */
export const DFR_PATH: Record<string, number> = {
  '2025-07': 0.0375,
  '2025-09': 0.035,
  '2025-10': 0.0325,
  '2025-12': 0.03,
  '2026-02': 0.0275,
  '2026-04': 0.025,
  '2026-06': BASE_DFR,
}
