import { Journal, posting } from './journal'
import { ACCOUNTS, Dims, JournalEvent } from './types'

/**
 * Two-phase money movement. An intent parks the amount in a per-movement
 * in-flight account and records the destination in event meta; the rail
 * simulator later settles it into the destination or compensates it back to
 * the source. The journal stays balanced and invariant-clean at every step.
 */

export interface TransferSpec {
  from: string
  to: string
  amountCents: number
  dims?: Dims
  memo?: string
  date: string
}

export function beginTransfer(journal: Journal, spec: TransferSpec): JournalEvent {
  const id = journal.nextId('mov')
  return journal.append({
    id,
    date: spec.date,
    kind: 'transfer_intent',
    phase: 'intent',
    memo: spec.memo,
    meta: { to: spec.to },
    postings: [
      posting(ACCOUNTS.inFlight(id), 'debit', spec.amountCents, spec.dims ?? {}),
      posting(spec.from, 'credit', spec.amountCents, spec.dims ?? {}),
    ],
  })
}

export function settleTransfer(journal: Journal, intent: JournalEvent, date: string): JournalEvent {
  const leg = intentLeg(intent)
  return journal.append({
    id: journal.nextId('mov'),
    date,
    kind: 'transfer_settlement',
    phase: 'settlement',
    ref: intent.id,
    postings: [
      posting(intent.meta!.to, 'debit', leg.amountCents, leg.dims),
      posting(ACCOUNTS.inFlight(intent.id), 'credit', leg.amountCents, leg.dims),
    ],
  })
}

export function compensateTransfer(
  journal: Journal,
  intent: JournalEvent,
  date: string,
  reason: string,
): JournalEvent {
  const leg = intentLeg(intent)
  return journal.append({
    id: journal.nextId('mov'),
    date,
    kind: 'transfer_compensation',
    phase: 'compensation',
    ref: intent.id,
    memo: reason,
    postings: [
      posting(leg.account, 'debit', leg.amountCents, leg.dims),
      posting(ACCOUNTS.inFlight(intent.id), 'credit', leg.amountCents, leg.dims),
    ],
  })
}

function intentLeg(intent: JournalEvent): { account: string; amountCents: number; dims: Dims } {
  if (intent.phase !== 'intent' || !intent.meta?.to) {
    throw new Error(`Event ${intent.id} is not a transfer intent`)
  }
  const sourceLeg = intent.postings.find((p) => p.direction === 'credit')!
  return { account: sourceLeg.account, amountCents: sourceLeg.amountCents, dims: sourceLeg.dims }
}
