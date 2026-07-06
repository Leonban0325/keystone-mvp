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
