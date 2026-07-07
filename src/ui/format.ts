/** Display helpers. Everything money is integer cents until the last moment. */

export function eur(cents: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2
  const value = (cents / 100).toLocaleString('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `€${value}`
}

/** Compact money for stat tiles: €125,000 / €171.94. */
export function eurCompact(cents: number): string {
  return cents % 100 === 0 ? eur(cents, { decimals: 0 }) : eur(cents)
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function pct(rate: number, decimals = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`
}

/** Plain integer with thousands separators — counts, units, event totals. */
export function num(n: number): string {
  return n.toLocaleString('en-IE', { maximumFractionDigits: 0 })
}

/** Whole-euro display for row-level figures: €1,187 (no cents column noise). */
export function eurWhole(cents: number): string {
  return eur(Math.round(cents / 100) * 100, { decimals: 0 })
}
