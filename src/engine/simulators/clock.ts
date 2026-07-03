import { addDays } from '../compliance/dates'

export type TickHandler = (day: string, isMonthStart: boolean) => void

/**
 * The demo clock. Every time-driven behaviour in the app hangs off this:
 * advancing it replays each day in order so schedulers never skip a beat.
 */
export class DemoClock {
  private handlers: TickHandler[] = []

  constructor(public today: string) {}

  onTick(handler: TickHandler): void {
    this.handlers.push(handler)
  }

  advanceDays(n: number): void {
    for (let i = 0; i < n; i += 1) {
      this.today = addDays(this.today, 1)
      const isMonthStart = this.today.endsWith('-01')
      for (const handler of this.handlers) handler(this.today, isMonthStart)
    }
  }

  advanceMonths(n: number): void {
    for (let i = 0; i < n; i += 1) {
      // Advance day-by-day until we cross the next month boundary.
      do {
        this.advanceDays(1)
      } while (!this.today.endsWith('-01'))
    }
  }

  /** Advance until (and including) the given date. */
  advanceTo(date: string): void {
    while (this.today < date) this.advanceDays(1)
  }
}
