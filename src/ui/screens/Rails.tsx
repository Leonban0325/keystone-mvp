import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { Badge, Button, Card, ConfirmDialog, EmptyState, toast } from '../components'
import { eur, formatDate } from '../format'
import { PARTNER_BANK, RAILS } from '../../config'
import { JournalEvent } from '../../engine/ledger/types'
import { addDays } from '../../engine/compliance/dates'
import { keyedRand } from '../../engine/simulators/realism'

/**
 * Money Rails (Addendum E §1) — "here's how it actually works". The
 * tripartite structure with Keystone BESIDE the flow (control, not custody),
 * and the two-phase settlement state machine animated over REAL journal
 * events: the correlation IDs are event ids, the postings shown are the
 * actual intent → settlement/compensation pair from the ledger. Honestly
 * badged as simulated; the partner bank comes from config, never hard-coded.
 */

type FlowKind = 'collection' | 'custody' | 'payout'

interface FlowStep {
  state: string
  system: 'EMI / escrow' | 'Partner bank' | 'Keystone orchestration' | 'Keystone ledger' | 'KYC provider'
  at: string
  time: string
  ref?: string
  detail?: string
  tone?: 'ok' | 'fail'
  postings?: JournalEvent
}

/**
 * Deterministic clock-time for a step — stable per (ref, state), and
 * MONOTONIC within a flow: later steps get later hours, so a same-day
 * Submitted → Settling → Settled sequence reads correctly.
 */
function stepTime(ref: string, state: string, order = 0): string {
  const rand = keyedRand(ref, state, 'railtime')
  const hour = Math.min(19, 8 + order + Math.floor(rand() * 2))
  const minute = Math.floor(rand() * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function collectionFlow(intent: JournalEvent, resolution?: JournalEvent): FlowStep[] {
  const lease = intent.postings[0].dims.leaseId ?? 'lease'
  const mandateRef = `MNDT-${Math.abs(hash(lease)) % 100_000}`
  const steps: FlowStep[] = [
    {
      state: 'MandateActive',
      system: 'EMI / escrow',
      at: addDays(intent.date, -14),
      time: stepTime(intent.id, 'mandate', 0),
      ref: mandateRef,
      detail: 'SEPA CORE mandate on file, signed at lease start',
    },
    {
      state: 'PreNotified',
      system: 'Keystone orchestration',
      at: addDays(intent.date, -3),
      time: stepTime(intent.id, 'prenotify', 1),
      ref: `PRE-${intent.id.slice(-6)}`,
      detail: 'D−3 pre-notification to the debtor (SEPA rulebook)',
    },
    {
      state: 'Submitted',
      system: 'EMI / escrow',
      at: intent.date,
      time: stepTime(intent.id, 'submit', 2),
      ref: intent.id,
      detail: 'Collection presented — intent leg posted',
      postings: intent,
    },
    {
      state: 'Settling…',
      system: 'Partner bank',
      at: intent.date,
      time: stepTime(intent.id, 'settling', 3),
      detail: 'In flight — funds in a per-movement suspense account',
    },
  ]
  if (!resolution) return steps
  if (resolution.kind === 'transfer_compensation') {
    steps.push(
      {
        state: 'R-transaction',
        system: 'Partner bank',
        at: resolution.date,
        time: stepTime(resolution.id, 'rfail', 4),
        ref: resolution.id,
        tone: 'fail',
        detail: resolution.memo ?? 'Returned unpaid',
        postings: resolution,
      },
      {
        state: 'Compensated → retry scheduled',
        system: 'Keystone ledger',
        at: resolution.date,
        time: stepTime(resolution.id, 'retry', 5),
        detail: 'Compensating entry restores the receivable; the next cycle sweeps the full balance',
      },
    )
  } else {
    steps.push(
      {
        state: 'Settled',
        system: 'Partner bank',
        at: resolution.date,
        time: stepTime(resolution.id, 'settle', 4),
        ref: resolution.id,
        tone: 'ok',
        detail: 'Funds land in the segregated operating pool — settlement leg posted',
        postings: resolution,
      },
      {
        state: 'Reconciled ✓',
        system: 'Keystone ledger',
        at: resolution.date,
        time: stepTime(resolution.id, 'reconcile', 5),
        tone: 'ok',
        detail: 'Σ debits = Σ credits · receivable closed · dimension trail intact',
      },
    )
  }
  return steps
}

function custodyFlow(event: JournalEvent): FlowStep[] {
  return [
    {
      state: 'Received',
      system: 'EMI / escrow',
      at: event.date,
      time: stepTime(event.id, 'recv', 0),
      ref: `VIB-${event.id.slice(-6)}`,
      detail: 'Deposit arrives on the per-lease virtual IBAN',
    },
    {
      state: 'Screened (AML)',
      system: 'KYC provider',
      at: event.date,
      time: stepTime(event.id, 'aml', 1),
      detail: `${RAILS.kycClass} — CDD + sanctions screening pass`,
    },
    {
      state: `Segregated @ ${PARTNER_BANK.short}`,
      system: 'Partner bank',
      at: event.date,
      time: stepTime(event.id, 'seg', 2),
      ref: event.id,
      detail: 'Ring-fenced client money account — insolvency-remote',
      postings: event,
    },
    {
      state: 'DGS-confirmed',
      system: 'Partner bank',
      at: event.date,
      time: stepTime(event.id, 'dgs', 3),
      tone: 'ok',
      detail: PARTNER_BANK.dgsNote,
    },
  ]
}

function payoutFlow(event: JournalEvent): FlowStep[] {
  return [
    {
      state: 'Scheduled',
      system: 'Keystone orchestration',
      at: addDays(event.date, -1),
      time: stepTime(event.id, 'sched', 0),
      detail: 'Monthly distribution run — waterfall computed from the journal',
    },
    {
      state: 'ReserveTopUp',
      system: 'Keystone orchestration',
      at: event.date,
      time: stepTime(event.id, 'reserve', 1),
      detail: 'Reserve floors checked per property before anything leaves',
    },
    {
      state: 'VendorNetted',
      system: 'EMI / escrow',
      at: event.date,
      time: stepTime(event.id, 'vendor', 2),
      detail: 'Card spend and fees netted against the owner payable',
    },
    {
      state: 'OwnerDistributed',
      system: 'Partner bank',
      at: event.date,
      time: stepTime(event.id, 'dist', 3),
      ref: event.id,
      tone: 'ok',
      detail: 'SEPA credit transfer to the owner — ledger posts the distribution',
      postings: event,
    },
  ]
}

function hash(s: string): number {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0
  return h
}

export default function Rails() {
  const { world, rev, focus, setFocus, mutate } = useApp()
  void rev

  // Pick the focused flow: a specific journal event (from the Money
  // click-through) or the most recent settled collection.
  const flows = useMemo(() => {
    const byRef = new Map<string, JournalEvent>()
    for (const e of world.journal.all) {
      if (e.ref) byRef.set(e.ref, e)
    }
    return { byRef }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, rev])

  const [selectedId, setSelectedId] = useState<string | null>(focus?.eventId ?? null)
  useEffect(() => {
    if (focus?.eventId) setSelectedId(focus.eventId)
    if (focus) setFocus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.eventId])

  const selected = useMemo(() => {
    const all = world.journal.all
    let event = selectedId ? all.find((e) => e.id === selectedId) : undefined
    if (!event) event = [...all].reverse().find((e) => e.kind === 'transfer_settlement')
    if (!event) return null
    // Normalize to the flow root: resolutions point at their intent.
    if (event.kind === 'transfer_settlement' || event.kind === 'transfer_compensation') {
      const intent = all.find((e) => e.id === event!.ref)
      if (intent) {
        return { kind: 'collection' as FlowKind, intent, resolution: event }
      }
    }
    if (event.kind === 'transfer_intent') {
      return { kind: 'collection' as FlowKind, intent: event, resolution: flows.byRef.get(event.id) }
    }
    if (event.kind === 'deposit_collected') return { kind: 'custody' as FlowKind, intent: event }
    if (event.kind === 'owner_distribution') return { kind: 'payout' as FlowKind, intent: event }
    return { kind: 'collection' as FlowKind, intent: event, resolution: flows.byRef.get(event.id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, world, rev])

  const steps = useMemo(() => {
    if (!selected) return []
    if (selected.kind === 'custody') return custodyFlow(selected.intent)
    if (selected.kind === 'payout') return payoutFlow(selected.intent)
    return collectionFlow(selected.intent, selected.resolution)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // §1.3 the animation: steps reveal in sequence; replayable.
  const [visible, setVisible] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    setVisible(0)
    if (steps.length === 0) return
    const timer = setInterval(() => {
      setVisible((v) => {
        if (v >= steps.length) {
          clearInterval(timer)
          return v
        }
        return v + 1
      })
    }, 550)
    return () => clearInterval(timer)
  }, [steps, animKey])

  const failed = steps.some((s) => s.tone === 'fail')

  // Live pending collections — the demoable failure path (§1.3).
  const pending = world.state.pendingIntents
  const [confirming, setConfirming] = useState<{ id: string; outcome: 'settle' | 'fail' } | null>(null)

  const flowTitle = !selected
    ? 'No flow selected'
    : selected.kind === 'custody'
      ? 'Deposit custody'
      : selected.kind === 'payout'
        ? 'Owner payout'
        : 'Rent collection (SDD)'

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Payment processing</h1>
        <Badge tone="ink">{PARTNER_BANK.name}</Badge>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* §1.3 — two-phase settlement, real states, real postings */}
        <Card title={`Processing — ${flowTitle}`} className="col-span-3">
          {!selected && (
            <EmptyState
              title="No money movement selected."
              hint="Open Money and click the processing link on any payment row."
            />
          )}
          {selected && (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-greyx">
                <span>
                  {selected.intent.memo ?? selected.intent.kind} ·{' '}
                  {eur(selected.intent.postings[0].amountCents)}
                </span>
                <Button tone="quiet" onClick={() => setAnimKey((k) => k + 1)}>
                  ↻ Replay
                </Button>
              </div>
              <ol className="space-y-0">
                {steps.map((step, i) => {
                  const shown = i < visible
                  const current = i === visible - 1 && visible < steps.length
                  return (
                    <li
                      key={step.state}
                      className={`grid grid-cols-[130px_1fr] gap-3 border-l-2 py-2 pl-4 transition-opacity duration-300 ${
                        step.tone === 'fail'
                          ? 'border-[#B4392E]'
                          : step.tone === 'ok'
                            ? 'border-[#3D6B47]'
                            : 'border-hairline'
                      } ${shown ? 'opacity-100' : 'opacity-15'}`}
                    >
                      <div className="text-xs text-greyx">
                        <div className="tabular-nums">
                          {formatDate(step.at)} · {step.time}
                        </div>
                        <div className="mt-0.5">{step.system}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className={`font-medium ${step.tone === 'fail' ? 'text-[#B4392E]' : ''} ${current ? 'rail-pulse' : ''}`}
                          >
                            {step.state}
                          </span>
                          {step.ref && (
                            <span className="font-mono text-[10px] text-greyx">{step.ref}</span>
                          )}
                        </div>
                        {shown && step.detail && (
                          <div className="mt-0.5 text-xs text-greyx">{step.detail}</div>
                        )}
                        {shown && step.postings && (
                          <table className="mt-1.5 w-full border rule bg-white/50 text-[11px]">
                            <tbody>
                              {step.postings.postings.map((p, pi) => (
                                <tr key={pi}>
                                  <td className="px-2 py-0.5 font-mono">{p.account}</td>
                                  <td className="px-2 py-0.5 text-right tabular-nums">
                                    {p.direction === 'debit' ? `D ${eur(p.amountCents)}` : `C ${eur(p.amountCents)}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
              {visible >= steps.length && (
                <div className="mt-3 border-t rule pt-2 text-xs text-greyx">
                  {failed
                    ? 'Returned unpaid — the compensating entry keeps the ledger balanced and the receivable open for retry.'
                    : 'Both ledger legs posted and reconciled against the rail confirmation.'}
                </div>
              )}
            </>
          )}
        </Card>

        <div className="col-span-2 space-y-5">
          <Card title={`In flight now — ${pending.length}`}>
            {pending.length === 0 && (
              <EmptyState
                title="Nothing in flight."
                hint="Collections appear here between presentation and settlement."
              />
            )}
            <table className="w-full text-sm">
              <tbody>
                {pending.slice(0, 6).map((p) => (
                  <tr key={p.intent.id} className="border-t rule first:border-t-0">
                    <td className="max-w-44 truncate py-1.5 text-xs">{p.intent.memo}</td>
                    <td className="py-1.5 text-right text-xs tabular-nums">
                      {eur(p.intent.postings[0].amountCents)}
                    </td>
                    <td className="py-1.5 text-right">
                      <Button tone="quiet" onClick={() => setConfirming({ id: p.intent.id, outcome: 'settle' })}>
                        Settle
                      </Button>{' '}
                      <Button tone="quiet" onClick={() => setConfirming({ id: p.intent.id, outcome: 'fail' })}>
                        Force R
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Rail connections">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { name: PARTNER_BANK.name, sub: PARTNER_BANK.descriptor },
                  { name: 'EMI / escrow', sub: RAILS.emiClass },
                  { name: 'Card issuer-processor', sub: RAILS.cardClass },
                  { name: 'KYC / AML', sub: RAILS.kycClass },
                ].map((c, i) => (
                  <tr key={c.name} className="border-t rule first:border-t-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#3D6B47]" />
                        <span className="font-medium">{c.name}</span>
                      </div>
                      <div className="mt-0.5 pl-4 text-[11px] text-greyx">{c.sub}</div>
                    </td>
                    <td className="py-2 text-right align-top text-[11px] text-greyx">
                      <div>Active</div>
                      <div className="tabular-nums">
                        updated {formatDate(world.today)} {stepTime(world.today, `hb${i}`)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming?.outcome === 'fail' ? 'Force an R-transaction?' : 'Settle this collection now?'}
        body={
          confirming?.outcome === 'fail'
            ? 'The rail will return the collection unpaid. A compensating entry restores the receivable and the dunning clock starts — the failure path, live.'
            : 'The rail confirms and the settlement leg posts to the ledger.'
        }
        confirmLabel={confirming?.outcome === 'fail' ? 'Force R' : 'Settle'}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return
          const { id, outcome } = confirming
          setConfirming(null)
          mutate((w) => w.resolvePendingNow(id, outcome))
          const resolution = [...world.journal.all].reverse().find((e) => e.ref === id)
          if (resolution) setSelectedId(resolution.id)
          setAnimKey((k) => k + 1)
          toast(
            outcome === 'fail'
              ? 'R-transaction posted — compensating entry on the ledger.'
              : 'Settled — settlement leg posted and reconciled.',
            outcome === 'fail' ? 'info' : 'ok',
          )
        }}
      />
    </div>
  )
}
