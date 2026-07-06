import {
  ACCOUNTS,
  DEPOSITS_HELD_PREFIX,
  Dims,
  Direction,
  JournalEvent,
  LedgerError,
  Posting,
  SEGREGATED_PREFIX,
  isDebitNormal,
} from './types'

/** Raw balances are debit-positive per account. */
export type RawBalances = Map<string, number>

export interface LedgerSnapshot {
  /** Debit-positive raw balance per account. */
  raw: RawBalances
  /** Segregated deposit cash per jurisdiction (cents). */
  segregatedDepositCash: Map<string, number>
  /** Deposit liabilities per jurisdiction (cents). */
  depositLiabilities: Map<string, number>
}

function bump(map: Map<string, number>, key: string, delta: number) {
  map.set(key, (map.get(key) ?? 0) + delta)
}

export function foldBalances(events: readonly JournalEvent[]): LedgerSnapshot {
  const snapshot: LedgerSnapshot = {
    raw: new Map(),
    segregatedDepositCash: new Map(),
    depositLiabilities: new Map(),
  }
  for (const event of events) applyEvent(snapshot, event, 1)
  return snapshot
}

function applyEvent(snapshot: LedgerSnapshot, event: JournalEvent, sign: 1 | -1): void {
  for (const p of event.postings) {
    const signed = (p.direction === 'debit' ? p.amountCents : -p.amountCents) * sign
    bump(snapshot.raw, p.account, signed)
    if (p.account === ACCOUNTS.segregatedDeposits) {
      bump(snapshot.segregatedDepositCash, p.dims.jurisdiction!, signed)
    }
    if (p.account.startsWith(DEPOSITS_HELD_PREFIX)) {
      // Liabilities grow with credits.
      bump(snapshot.depositLiabilities, p.dims.jurisdiction!, -signed)
    }
  }
}

function validateEvent(event: JournalEvent): void {
  if (event.postings.length < 2) {
    throw new LedgerError(`Event ${event.id}: needs at least two postings`)
  }
  let debits = 0
  let credits = 0
  for (const p of event.postings) {
    if (!Number.isInteger(p.amountCents) || p.amountCents <= 0) {
      throw new LedgerError(
        `Event ${event.id}: amounts must be positive integer cents, got ${p.amountCents} on ${p.account}`,
      )
    }
    if (p.direction === 'debit') debits += p.amountCents
    else credits += p.amountCents
    const needsJurisdiction =
      p.account === ACCOUNTS.segregatedDeposits || p.account.startsWith(DEPOSITS_HELD_PREFIX)
    if (needsJurisdiction && !p.dims.jurisdiction) {
      throw new LedgerError(
        `Event ${event.id}: posting to ${p.account} must carry dims.jurisdiction`,
      )
    }
  }
  if (debits !== credits) {
    throw new LedgerError(`Event ${event.id}: unbalanced (debits ${debits} ≠ credits ${credits})`)
  }
}

/** Check invariants only on what this event touched — O(postings), not O(journal). */
function assertInvariants(snapshot: LedgerSnapshot, event: JournalEvent): void {
  for (const p of event.postings) {
    if (p.account.startsWith(SEGREGATED_PREFIX)) {
      const value = snapshot.raw.get(p.account) ?? 0
      if (value < 0) {
        throw new LedgerError(
          `Event ${event.id}: would drive segregated account ${p.account} negative (${value})`,
        )
      }
    }
    const jurisdiction = p.dims.jurisdiction
    if (
      jurisdiction &&
      (p.account === ACCOUNTS.segregatedDeposits || p.account.startsWith(DEPOSITS_HELD_PREFIX))
    ) {
      const cash = snapshot.segregatedDepositCash.get(jurisdiction) ?? 0
      const liability = snapshot.depositLiabilities.get(jurisdiction) ?? 0
      if (cash < liability) {
        throw new LedgerError(
          `Event ${event.id}: segregated deposit cash ${cash} < deposit liabilities ${liability} in ${jurisdiction}`,
        )
      }
    }
  }
}

/**
 * Append-only journal. Every append is validated (balanced, integer cents)
 * and checked against the segregation invariants; a violating event is
 * rejected atomically (the applied deltas are rolled back). Balances fold
 * incrementally so appends stay O(postings) even at enterprise scale.
 */
export class Journal {
  private events: JournalEvent[] = []
  private snapshot: LedgerSnapshot = foldBalances([])
  private seq = 0

  get all(): readonly JournalEvent[] {
    return this.events
  }

  nextId(prefix = 'evt'): string {
    this.seq += 1
    return `${prefix}-${String(this.seq).padStart(5, '0')}`
  }

  append(event: JournalEvent): JournalEvent {
    validateEvent(event)
    applyEvent(this.snapshot, event, 1)
    try {
      assertInvariants(this.snapshot, event)
    } catch (error) {
      applyEvent(this.snapshot, event, -1) // atomic reject
      throw error
    }
    this.events.push(event)
    return event
  }

  /** Natural-sign balance: assets/expenses debit-positive, liabilities/income credit-positive. */
  balance(account: string): number {
    const raw = this.snapshot.raw.get(account) ?? 0
    return isDebitNormal(account) ? raw : -raw
  }

  /** Sum of natural-sign balances over all accounts under a path prefix. */
  balanceUnder(prefix: string): number {
    let total = 0
    for (const [account, raw] of this.snapshot.raw) {
      if (account === prefix || account.startsWith(prefix + ':')) {
        total += isDebitNormal(account) ? raw : -raw
      }
    }
    return total
  }

  snapshotView(): LedgerSnapshot {
    return this.snapshot
  }

  /** Restore from a serialized event list (localStorage), re-validating everything. */
  static fromEvents(events: readonly JournalEvent[]): Journal {
    const journal = new Journal()
    for (const event of events) journal.append(event)
    journal.seq = events.length
    return journal
  }
}

/** Convenience posting constructor. */
export function posting(
  account: string,
  direction: Direction,
  amountCents: number,
  dims: Dims = {},
): Posting {
  return { account, direction, amountCents, dims }
}
