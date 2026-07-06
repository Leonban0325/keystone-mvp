/** Date helpers over ISO `YYYY-MM-DD` strings, UTC, no external deps. */

export function parseISO(date: string): Date {
  return new Date(date + 'T00:00:00Z')
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const d = parseISO(date)
  d.setUTCDate(d.getUTCDate() + days)
  return toISO(d)
}

/** Calendar-month addition; clamps to end of month (Jan 31 + 1mo → Feb 28/29). */
export function addMonths(date: string, months: number): string {
  const d = parseISO(date)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return toISO(d)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000)
}

/** `a < b` for ISO dates (lexicographic is safe for YYYY-MM-DD). */
export function isBefore(a: string, b: string): boolean {
  return a < b
}

/**
 * Number of commenced months strictly after `deadline` as of `now`.
 * One day past the deadline = 1 commenced month; a month and a day = 2.
 */
export function commencedMonthsAfter(deadline: string, now: string): number {
  if (now <= deadline) return 0
  let n = 1
  while (addMonths(deadline, n) < now) n += 1
  return n
}
