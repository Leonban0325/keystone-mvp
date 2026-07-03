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
  const raw: RawBalances = new Map()
  const segregatedDepositCash = new Map<string, number>()
  const depositLiabilities = new Map<string, number>()

  for (const event of events) {
    for (const p of event.postings) {
      const signed = p.direction === 'debit' ? p.amountCents : -p.amountCents
      bump(raw, p.account, signed)
      if (p.account === ACCOUNTS.segregatedDeposits) {
        bump(segregatedDepositCash, p.dims.jurisdiction!, signed)
      }
      if (p.account.startsWith(DEPOSITS_HELD_PREFIX)) {
        // Liabilities grow with credits.
        bump(depositLiabilities, p.dims.jurisdiction!, -signed)
      }
    }
  }
  return { raw, segregatedDepositCash, depositLiabilities }
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

function assertInvariants(snapshot: LedgerSnapshot, event: JournalEvent): void {
  // No negative segregated cash, ever.
  for (const [account, value] of snapshot.raw) {
    if (account.startsWith(SEGREGATED_PREFIX) && value < 0) {
      throw new LedgerError(
        `Event ${event.id}: would drive segregated account ${account} negative (${value})`,
      )
    }
  }
  // Segregated deposit cash must cover deposit liabilities in every jurisdiction.
  for (const [jurisdiction, liability] of snapshot.depositLiabilities) {
    const cash = snapshot.segregatedDepositCash.get(jurisdiction) ?? 0
    if (cash < liability) {
      throw new LedgerError(
        `Event ${event.id}: segregated deposit cash ${cash} < deposit liabilities ${liability} in ${jurisdiction}`,
      )
    }
  }
}

/**
 * Append-only journal. Every append is validated (balanced, integer cents)
 * and the post-commit snapshot is checked against the segregation invariants;
 * a violating event is rejected atomically.
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
    const candidate = foldBalances([...this.events, event])
    assertInvariants(candidate, event)
    this.events.push(event)
    this.snapshot = candidate
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
