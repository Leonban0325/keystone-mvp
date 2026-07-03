import { describe, expect, it } from 'vitest'
import { Journal, posting } from '../src/engine/ledger/journal'
import { ACCOUNTS, JournalEvent, LedgerError } from '../src/engine/ledger/types'
import { beginTransfer, compensateTransfer, settleTransfer } from '../src/engine/ledger/movements'
import { collectDeposit, makeLease } from './helpers'

const D = '2026-01-15'

function seedOperating(journal: Journal, cents: number): void {
  journal.append({
    id: journal.nextId(),
    date: D,
    kind: 'capital_in',
    postings: [
      posting(ACCOUNTS.operating, 'debit', cents),
      posting('equity:capital', 'credit', cents),
    ],
  })
}

describe('journal invariants', () => {
  it('accepts a balanced event and computes natural-sign balances', () => {
    const journal = new Journal()
    const lease = makeLease({ id: 'L1', jurisdiction: 'FR', depositCents: 120_000 })
    collectDeposit(journal, lease)
    expect(journal.balance(ACCOUNTS.segregatedDeposits)).toBe(120_000)
    expect(journal.balance(ACCOUNTS.depositsHeld('L1'))).toBe(120_000)
    expect(journal.balanceUnder('liabilities:deposits_held')).toBe(120_000)
  })

  it('rejects an unbalanced event', () => {
    const journal = new Journal()
    expect(() =>
      journal.append({
        id: 'bad-1',
        date: D,
        kind: 'oops',
        postings: [
          posting(ACCOUNTS.operating, 'debit', 100),
          posting('income:fees:saas', 'credit', 99),
        ],
      }),
    ).toThrow(LedgerError)
    expect(journal.all.length).toBe(0)
  })

  it('rejects non-integer and non-positive amounts', () => {
    const journal = new Journal()
    for (const amount of [10.5, 0, -100]) {
      expect(() =>
        journal.append({
          id: 'bad-2',
          date: D,
          kind: 'oops',
          postings: [
            posting(ACCOUNTS.operating, 'debit', amount),
            posting('income:fees:saas', 'credit', amount),
          ],
        }),
      ).toThrow(LedgerError)
    }
  })

  it('rejects deposit postings without a jurisdiction dim', () => {
    const journal = new Journal()
    expect(() =>
      journal.append({
        id: 'bad-3',
        date: D,
        kind: 'deposit_collected',
        postings: [
          posting(ACCOUNTS.segregatedDeposits, 'debit', 1000),
          posting(ACCOUNTS.depositsHeld('LX'), 'credit', 1000, { leaseId: 'LX' }),
        ],
      }),
    ).toThrow(/jurisdiction/)
  })

  it('enforces segregated cash ≥ deposit liabilities per jurisdiction', () => {
    const journal = new Journal()
    seedOperating(journal, 1_000_000)
    // Liability booked against operating cash, not segregated cash → cover fails in FR.
    expect(() =>
      journal.append({
        id: 'bad-4',
        date: D,
        kind: 'deposit_collected_wrong',
        postings: [
          posting(ACCOUNTS.operating, 'debit', 50_000),
          posting(ACCOUNTS.depositsHeld('L9'), 'credit', 50_000, {
            leaseId: 'L9',
            jurisdiction: 'FR',
          }),
        ],
      }),
    ).toThrow(/segregated deposit cash/)
  })

  it('keeps jurisdictions separate: NL cash cannot cover FR liabilities', () => {
    const journal = new Journal()
    const nlLease = makeLease({ id: 'L-NL', jurisdiction: 'NL', depositCents: 200_000 })
    collectDeposit(journal, nlLease)
    expect(() =>
      journal.append({
        id: 'bad-5',
        date: D,
        kind: 'deposit_collected_wrong',
        postings: [
          posting(ACCOUNTS.operating, 'debit', 50_000),
          posting(ACCOUNTS.depositsHeld('L-FR'), 'credit', 50_000, {
            leaseId: 'L-FR',
            jurisdiction: 'FR',
          }),
        ],
      }),
    ).toThrow(/in FR/)
  })

  it('never lets segregated accounts go negative', () => {
    const journal = new Journal()
    seedOperating(journal, 1_000_000)
    expect(() =>
      journal.append({
        id: 'bad-6',
        date: D,
        kind: 'sweep',
        postings: [
          posting(ACCOUNTS.operating, 'debit', 10_000),
          posting(ACCOUNTS.segregatedReserves, 'credit', 10_000),
        ],
      }),
    ).toThrow(/negative/)
  })

  it('a rejected event leaves the journal untouched (atomicity)', () => {
    const journal = new Journal()
    seedOperating(journal, 1_000_000)
    const before = journal.all.length
    try {
      journal.append({
        id: 'bad-7',
        date: D,
        kind: 'sweep',
        postings: [
          posting(ACCOUNTS.operating, 'debit', 10_000),
          posting(ACCOUNTS.segregatedReserves, 'credit', 10_000),
        ],
      })
    } catch {
      /* expected */
    }
    expect(journal.all.length).toBe(before)
    expect(journal.balance(ACCOUNTS.operating)).toBe(1_000_000)
  })

  it('restores from serialized events (localStorage round-trip)', () => {
    const journal = new Journal()
    const lease = makeLease({ id: 'L1', jurisdiction: 'FR' })
    collectDeposit(journal, lease)
    const revived = Journal.fromEvents(JSON.parse(JSON.stringify(journal.all)) as JournalEvent[])
    expect(revived.balance(ACCOUNTS.depositsHeld('L1'))).toBe(lease.depositCents)
  })
})

describe('two-phase movements', () => {
  it('intent parks funds in-flight, settlement lands them at the destination', () => {
    const journal = new Journal()
    seedOperating(journal, 500_000)
    const intent = beginTransfer(journal, {
      from: ACCOUNTS.operating,
      to: 'assets:cash:external:owner_bank',
      amountCents: 200_000,
      date: D,
    })
    expect(journal.balance(ACCOUNTS.operating)).toBe(300_000)
    expect(journal.balance(ACCOUNTS.inFlight(intent.id))).toBe(200_000)

    settleTransfer(journal, intent, D)
    expect(journal.balance(ACCOUNTS.inFlight(intent.id))).toBe(0)
  })

  it('a failed rail compensates back to the source, netting to zero', () => {
    const journal = new Journal()
    seedOperating(journal, 500_000)
    const intent = beginTransfer(journal, {
      from: ACCOUNTS.operating,
      to: 'assets:cash:external:vendor',
      amountCents: 125_000,
      date: D,
      memo: 'vendor payout',
    })
    compensateTransfer(journal, intent, D, 'R1: insufficient funds at counterparty')
    expect(journal.balance(ACCOUNTS.operating)).toBe(500_000)
    expect(journal.balance(ACCOUNTS.inFlight(intent.id))).toBe(0)
    const kinds = journal.all.map((e) => e.kind)
    expect(kinds).toContain('transfer_intent')
    expect(kinds).toContain('transfer_compensation')
  })
})
