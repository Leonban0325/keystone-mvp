import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { create as createQr } from 'qrcode'
import { PARTNER_BANK } from '../../config'
import { deck } from '../../data/deckData'

/**
 * The pitch deck — Build Brief v4 (supersedes all prior deck briefs).
 * Eleven Kawasaki slides (status/ask split) plus a Q&A appendix, on a warm
 * ivory canvas throughout. Display-serif roman/italic headline pairs,
 * wide-caps kickers, muted green accent. EVERY figure renders from
 * src/data/deckData.ts — no content literals in slide components. Fully
 * legible as static frames (reveals are fade+rise only). Keyboard / swipe /
 * chevrons advance; slides deep-link as /pitch#N (the appendix is #12).
 */

const MAIN_COUNT = 11
const TOTAL_COUNT = 12 // + appendix, reachable past the end

export default function Pitch() {
  const [index, setIndex] = useState(() => {
    const n = Number(window.location.hash.replace('#', ''))
    return Number.isInteger(n) && n >= 1 && n <= TOTAL_COUNT ? n - 1 : 0
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(TOTAL_COUNT - 1, next)))
  }, [])

  // Deep links: /pitch#3 ↔ slide 3; #12 is the appendix.
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}#${index + 1}`)
  }, [index])
  useEffect(() => {
    const onHash = () => {
      const n = Number(window.location.hash.replace('#', ''))
      if (Number.isInteger(n) && n >= 1 && n <= TOTAL_COUNT) setIndex(n - 1)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        go(index + 1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(index - 1)
      }
      if (e.key === 'Home') go(0)
      if (e.key === 'End') go(MAIN_COUNT - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go])

  const present = () => {
    containerRef.current?.requestFullscreen?.().catch(() => {
      // Fullscreen refused (permissions) — the in-page deck still presents.
    })
  }

  const slides = [
    <TitleSlide key="s1" />,
    <ProblemSlide key="s2" />,
    <ValueSlide key="s3" />,
    <MagicSlide key="s4" />,
    <ModelSlide key="s5" />,
    <GtmSlide key="s6" />,
    <CompetitionSlide key="s7" />,
    <TeamSlide key="s8" />,
    <FinancialsSlide key="s9" />,
    <StatusSlide key="s10" />,
    <AskSlide key="s11" />,
    <AppendixSlide key="s12" />,
  ]

  const onAppendix = index >= MAIN_COUNT

  return (
    <div className="-mx-6 py-6">
      <div
        ref={containerRef}
        className="deck relative w-full select-none border-y rule"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
      >
        {/* Slide surface */}
        <div className="mx-auto flex min-h-[78vh] w-full max-w-5xl items-center px-10 py-12">
          <div key={index} className="deck-slide w-full">
            {slides[index]}
          </div>
        </div>

        {/* Chrome: chevrons, counter, progress rail, present, appendix */}
        <button
          aria-label="Previous slide"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-4 text-2xl text-[color:var(--stone)] transition-colors hover:text-[color:var(--ink)] disabled:opacity-20"
        >
          ‹
        </button>
        <button
          aria-label="Next slide"
          onClick={() => go(index + 1)}
          disabled={index === TOTAL_COUNT - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-4 text-2xl text-[color:var(--stone)] transition-colors hover:text-[color:var(--ink)] disabled:opacity-20"
        >
          ›
        </button>
        <div className="absolute bottom-4 left-10 flex items-center gap-4 text-[11px] tracking-[0.14em] text-[color:var(--stone)]">
          <span className="tabular-nums uppercase">
            {onAppendix ? 'Appendix' : `${String(index + 1).padStart(2, '0')} — ${MAIN_COUNT}`}
          </span>
          <button
            onClick={present}
            className="border border-[color:var(--stone)] px-2 py-1 uppercase transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
          >
            Present
          </button>
          <button
            onClick={() => go(MAIN_COUNT)}
            className={`uppercase underline-offset-2 hover:text-[color:var(--ink)] hover:underline ${onAppendix ? 'text-[color:var(--ink)]' : ''}`}
          >
            Appendix
          </button>
        </div>
        {/* Progress rail (main deck only; full on the appendix) */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-black/5">
          <div
            className="h-full bg-[color:var(--accent)] transition-all duration-500"
            style={{ width: `${((Math.min(index, MAIN_COUNT - 1) + 1) / MAIN_COUNT) * 100}%` }}
          />
        </div>
        {/* Slide dots (clickable, main slides) */}
        <div className="absolute bottom-4 right-10 flex items-center gap-2">
          {Array.from({ length: MAIN_COUNT }, (_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? 'bg-[color:var(--accent)]' : 'bg-black/15 hover:bg-black/30'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="px-10 pt-2 text-center text-[10px] uppercase tracking-[0.14em] text-greyx">
        arrow keys · swipe · /pitch#{index + 1}
      </div>
    </div>
  )
}

// ── shared slide furniture ───────────────────────────────────────────────────

function Reveal(props: { children: ReactNode; order?: number; className?: string }) {
  return (
    <div className={`deck-reveal ${props.className ?? ''}`} style={{ animationDelay: `${(props.order ?? 0) * 130}ms` }}>
      {props.children}
    </div>
  )
}

function Kicker(props: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--stone)]">
      {props.children}
    </div>
  )
}

/** The house headline: first line roman, second line italic, each with a period. */
function HeadlinePair(props: { roman: ReactNode; italic?: ReactNode; size?: string }) {
  return (
    <h2 className={`deck-serif mt-3 ${props.size ?? 'text-5xl'} font-medium leading-[1.1] text-[color:var(--ink)]`}>
      {props.roman}
      {props.italic && (
        <>
          <br />
          <em>{props.italic}</em>
        </>
      )}
    </h2>
  )
}

function ArchMark(props: { size?: number }) {
  const s = props.size ?? 56
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
      <g stroke="var(--ink)" strokeWidth="1.1" fill="none">
        <path d="M3 20 V13 A9 9 0 0 1 21 13 V20" />
        <path d="M6.2 20 V13.4 A5.8 5.8 0 0 1 17.8 13.4 V20" />
      </g>
      <path d="M10 4.4 L14 4.4 L13.2 9.4 L10.8 9.4 Z" fill="var(--brass)" />
    </svg>
  )
}

function Footnote(props: { children: ReactNode }) {
  return <div className="mt-2 text-[10px] leading-relaxed text-[color:var(--stone)]">{props.children}</div>
}

/** €-formatting for figures coming out of deckData. */
const eurInt = (n: number) => `€${n.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`
const eurDec = (n: number) =>
  Number.isInteger(n) ? eurInt(n) : `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => n.toLocaleString('en-IE')

// ── 01 · Title ───────────────────────────────────────────────────────────────

function TitleSlide() {
  return (
    <div className="flex min-h-[62vh] flex-col justify-end">
      <Reveal order={0} className="absolute right-10 top-10">
        <ArchMark />
      </Reveal>
      <Reveal order={1}>
        <Kicker>The financial operating system for European rental real estate</Kicker>
      </Reveal>
      <Reveal order={2}>
        <h1 className="deck-serif mt-4 text-9xl font-medium tracking-tight text-[color:var(--ink)]">
          Keystone
        </h1>
      </Reveal>
      <Reveal order={3}>
        <div className="mt-8 h-px w-full bg-[color:var(--stone)] opacity-40" />
        <div className="mt-5 flex items-baseline justify-between text-sm text-[color:var(--ink)]">
          <span className="tracking-wide">{deck.founders.join(' · ')}</span>
          <span className="flex items-baseline gap-6 text-[11px] uppercase tracking-[0.22em] text-[color:var(--stone)]">
            <span>{deck.contactEmail}</span>
            <span>{deck.year}</span>
          </span>
        </div>
      </Reveal>
    </div>
  )
}

// ── 02 · Problem ─────────────────────────────────────────────────────────────

function ProblemSlide() {
  const consequences: [string, ReactNode][] = [
    ['Hours lost', `${deck.problem.hoursPerUnit} on reconciliation, bookkeeping, filings.`],
    [
      'Money leaking',
      `${deck.problem.missedIndexation}; overpaid taxes, utilities, insurance and vendor contracts go unnoticed year after year.`,
    ],
    [
      'Cash frozen',
      `every one of these tenancies carries a deposit and a reserve sitting at 0%. ${deck.market.deDepositPool}.`,
    ],
    ['Risk accumulating', `${deck.problem.disputeCost}; ${deck.problem.frPenalty}.`],
  ]
  return (
    <div>
      <Reveal order={0}>
        <Kicker>The problem</Kicker>
        <div className="mt-3 text-sm text-[color:var(--ink)]/80">
          Meet {deck.persona.name} — {deck.persona.desc}.
        </div>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[color:var(--stone)]">
          <span className="text-[color:var(--ink)]">Rental finance was never built as a system.</span>{' '}
          Banks move money but don't understand rentals; property software tracks units but never
          touches money. So {deck.persona.name} improvises: a personal account, a spreadsheet, a
          shoebox of receipts.
        </p>
      </Reveal>
      <Reveal order={1}>
        <div className="deck-serif mt-6 text-5xl font-medium leading-[1.15] text-[color:var(--ink)]">
          European tenants pay{' '}
          <span className="text-[color:var(--accent)]">{deck.market.rentActual2022}</span> in rent
          every year — and rising.
        </div>
        <div className="mt-2 text-sm text-[color:var(--stone)]">
          growing {deck.market.rentHistGrowth} · projected {deck.market.rentProjected2026} by 2026
        </div>
        <Footnote>{deck.market.provenance}</Footnote>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-3">
          {consequences.map(([title, line]) => (
            <div key={title} className="flex gap-3 border-t border-[color:var(--stone)]/30 pt-2 text-[13px] leading-relaxed">
              <span className="w-36 shrink-0 font-semibold text-[color:var(--ink)]">{title}</span>
              <span className="text-[color:var(--stone)]">{line}</span>
            </div>
          ))}
        </div>
        <Footnote>
          Hours and leakage figures: internal estimates from landlord interviews. Deposit-pool
          figure: estimate. Statutory penalty and market figures: as reported.
        </Footnote>
      </Reveal>
      <Reveal order={3}>
        <p className="deck-serif mt-6 text-xl italic text-[color:var(--ink)]/85">
          Millions of European landlords run a regulated financial business with no system built
          for it.
        </p>
      </Reveal>
    </div>
  )
}

// ── 03 · Value proposition ───────────────────────────────────────────────────

/**
 * Renders deck.valueProp VERBATIM, split across three visual lines with the
 * key phrases weighted — the string itself is untouched.
 */
function WeightedValueProp() {
  const text = deck.valueProp
  const emphases = ['full financial life', 'one intelligent account', 'compliant by construction']
  const breaks = ['of their portfolio ', 'one intelligent account — ']
  // Insert visual line breaks after the break anchors, then bold the emphases.
  const lines = useMemo(() => {
    let rest = text
    const out: string[] = []
    for (const anchor of breaks) {
      const at = rest.indexOf(anchor)
      if (at === -1) return [text]
      out.push(rest.slice(0, at + anchor.length))
      rest = rest.slice(at + anchor.length)
    }
    out.push(rest)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const renderLine = (line: string) => {
    let segments: { text: string; bold: boolean }[] = [{ text: line, bold: false }]
    for (const phrase of emphases) {
      segments = segments.flatMap((seg) => {
        if (seg.bold) return [seg]
        const at = seg.text.toLowerCase().indexOf(phrase.toLowerCase())
        if (at === -1) return [seg]
        return [
          { text: seg.text.slice(0, at), bold: false },
          { text: seg.text.slice(at, at + phrase.length), bold: true },
          { text: seg.text.slice(at + phrase.length), bold: false },
        ]
      })
    }
    return segments.map((seg, i) =>
      seg.bold ? (
        <strong key={i} className="font-semibold text-[color:var(--ink)]">
          {seg.text}
        </strong>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )
  }

  return (
    <div className="deck-serif max-w-4xl text-4xl font-normal leading-[1.5] text-[color:var(--ink)]/75">
      {lines.map((line, i) => (
        <div key={i}>{renderLine(line)}</div>
      ))}
    </div>
  )
}

function ValueSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Value proposition</Kicker>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-6">
          <WeightedValueProp />
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-10 border-t border-[color:var(--stone)]/30 pt-4">
          <div className="flex flex-wrap items-baseline gap-3 text-[13px] text-[color:var(--stone)]">
            <span>personal account · spreadsheet · manual filings</span>
            <span className="text-[color:var(--ink)]">→</span>
            <span className="font-medium text-[color:var(--accent)]">one Keystone account</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[12px] leading-relaxed text-[color:var(--stone)]">
            <span>
              <span className="font-semibold text-[color:var(--ink)]">1</span> Connect the
              portfolio — rent-roll import, a data migration, not a sales cycle
            </span>
            <span>
              <span className="font-semibold text-[color:var(--ink)]">2</span> Rails switch over —
              per-lease account, self-reconciling
            </span>
            <span>
              <span className="font-semibold text-[color:var(--ink)]">3</span> The system takes
              over — books, deadlines, cost-detection, treasury
            </span>
          </div>
          <div className="mt-3 text-[12px] text-[color:var(--ink)]/70">
            fewer hours · lower costs · books tax-ready · deposits handled correctly · idle cash
            earning
          </div>
        </div>
      </Reveal>
    </div>
  )
}

// ── 04 · Underlying magic ────────────────────────────────────────────────────

const LEASE_CHAIN: [string, string, string][] = [
  ['T+0', 'Lease signed', 'AI reads the document; rules encode the regime.'],
  ['T+1', 'Virtual account', 'Per-lease collection; deposit segregated at the partner bank.'],
  ['M+1', 'Rent cleared', 'Collection settles; the books post themselves, double-entry.'],
  ['M+6', 'Yield accrued', 'Idle balances earn at the policy rate.'],
  ['EXIT', 'Deposit returned', 'The statutory clock is met; the ledger closes to the cent.'],
]

function EventChain() {
  return (
    <div>
      {LEASE_CHAIN.map(([tick, title, line], i) => (
        <div key={tick} className="relative flex gap-4 pb-5 last:pb-0">
          {i < LEASE_CHAIN.length - 1 && (
            <span className="absolute left-[5px] top-4 h-full w-px bg-[color:var(--stone)] opacity-40" />
          )}
          <span className="relative mt-1 inline-block h-[11px] w-[11px] shrink-0 rounded-full border border-[color:var(--ink)] bg-transparent" />
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
              {tick}
            </span>
            <div className="text-base font-semibold leading-snug text-[color:var(--ink)]">{title}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-[color:var(--stone)]">{line}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MagicSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>How it works</Kicker>
        <HeadlinePair roman="Deterministic core." italic="Probabilistic edges." />
      </Reveal>
      <div className="mt-10 grid grid-cols-[1.2fr_1fr] gap-16">
        <Reveal order={1}>
          <div className="space-y-0">
            {[
              ['Compliance engine', 'European statutory regimes as versioned rules-as-code — caps, clocks, lodgement, interest. Ours; the moat.'],
              ['EMI / escrow rail', 'A regulated escrow layer moves every euro. Rented, not built.'],
              [`${PARTNER_BANK.short} vault`, 'Client funds segregated, DGS-protected, insolvency-remote at the partner bank.'],
            ].map(([title, line], i) => (
              <div key={title} className={`border border-[color:var(--stone)]/40 p-5 ${i > 0 ? 'border-t-0' : ''}`}>
                <div className="deck-serif text-xl text-[color:var(--ink)]">{title}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-[color:var(--stone)]">{line}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline gap-3 text-[13px] text-[color:var(--stone)]">
            <span className="deck-serif text-lg text-[color:var(--accent)]">Keystone</span>
            beside the flow — money never touches our balance sheet.
          </div>
          <p className="mt-6 border-t border-[color:var(--stone)]/30 pt-4 text-[15px] text-[color:var(--stone)]">
            Deterministic core — <span className="text-[color:var(--ink)]">rules decide, AI only reads documents.</span>
          </p>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
            One lease, event by event
          </div>
          <div className="mt-4">
            <EventChain />
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 05 · Business model ──────────────────────────────────────────────────────

function ModelSlide() {
  const streams: [string, string][] = [
    ['SaaS subscription — the core', eurInt(deck.revenue.saas)],
    ['Savings engine success fee — 25% of documented first-year savings', eurDec(deck.revenue.savingsFee)],
    ['NIM share — 27% of yield on idle balances (the only rate-linked line)', eurInt(deck.revenue.nim)],
    ['Card interchange', eurInt(deck.revenue.interchange)],
    ['Deposit custody & guarantee', eurInt(deck.revenue.custody)],
    ['Premium compliance tier — lodgement-market workflows', '—'],
    ['Supplier network / embedded finance', 'later'],
  ]
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Business model</Kicker>
        <HeadlinePair
          roman={
            <>
              {eurInt(deck.revenue.fullStackPerUnit)} per unit.{' '}
            </>
          }
          italic="Per year, full stack."
        />
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.25fr_1fr] gap-14">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Seven revenue streams — per unit / yr
          </div>
          <div className="mt-3 divide-y divide-[color:var(--stone)]/25 border-y border-[color:var(--stone)]/25">
            {streams.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 py-2 text-[13px]">
                <span className="text-[color:var(--ink)]/85">{label}</span>
                <span className="shrink-0 tabular-nums font-medium text-[color:var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[13px] text-[color:var(--stone)]">
            {deck.revenue.rateIndependentShare} of revenue is rate-independent.
          </div>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Pricing by client
          </div>
          <div className="mt-3 divide-y divide-[color:var(--stone)]/25 border-y border-[color:var(--stone)]/25">
            {deck.pricing.map((p) => (
              <div key={p.segment} className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
                <span className="text-[color:var(--ink)]/85">{p.segment}</span>
                <span className="shrink-0 text-[color:var(--stone)]">
                  {p.plan} · <span className="tabular-nums font-medium text-[color:var(--ink)]">{eurInt(p.eurPerUnitMo)}</span>/unit/mo
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-[color:var(--stone)]">
            Who pays: the owner or operator. What for: the account that runs everything. How it
            scales: per unit, priced to the segment.
          </p>
        </Reveal>
      </div>
    </div>
  )
}

// ── 06 · Go-to-market ────────────────────────────────────────────────────────

function GtmSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Go-to-market</Kicker>
        <HeadlinePair roman="Owner-yield markets first." italic="Partnerships scale it." />
      </Reveal>
      <Reveal order={1}>
        <div className="mt-12 flex items-center gap-0">
          {[
            ['First', 'France · Netherlands · Spain', 'deposit float investable, compliance pain acute'],
            ['Then', 'Expansion across Europe', 'the engine speaks each market’s statute before the sales team arrives'],
          ].map(([when, markets, line], i) => (
            <div key={String(when)} className="flex flex-1 items-center">
              {i > 0 && <span className="px-4 text-[color:var(--stone)]">→</span>}
              <div className="flex-1 border-t border-[color:var(--ink)] pt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">{when}</div>
                <div className="deck-serif mt-1 text-3xl text-[color:var(--ink)]">{markets}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-[color:var(--stone)]">{line}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-14 flex divide-x divide-[color:var(--stone)]/30 border-y border-[color:var(--stone)]/30 text-[13px]">
          {[
            ['Property managers', 'hundreds of units per contract'],
            ['Landlord-software integrations', 'embedded as the financial layer'],
            ['Landlord associations', 'the trusted route to owners'],
            ['Partner-bank SME channel', 'the bank refers its landlords'],
          ].map(([channel, line]) => (
            <div key={channel} className="flex-1 px-4 py-3">
              <div className="font-medium text-[color:var(--ink)]">{channel}</div>
              <div className="mt-1 text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px] text-[color:var(--stone)]">
          One partnership → <span className="text-[color:var(--ink)]">thousands of units</span>.
          Units arrive by contract, not one-by-one.
        </p>
      </Reveal>
    </div>
  )
}

// ── 07 · Competition ─────────────────────────────────────────────────────────

function CompetitionSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Competition</Kicker>
        <HeadlinePair roman="Alone in the quadrant." />
      </Reveal>
      <div className="mt-8 grid grid-cols-[1fr_320px] gap-10">
        <Reveal order={1}>
          <svg viewBox="0 0 520 340" className="w-full">
            {/* two thin ink axes — no bounding box */}
            <line x1="60" y1="20" x2="60" y2="300" stroke="var(--ink)" strokeWidth="1" />
            <line x1="60" y1="300" x2="500" y2="300" stroke="var(--ink)" strokeWidth="1" />
            <text x="500" y="318" textAnchor="end" fontSize="11" fill="var(--stone)">multi-country compliance →</text>
            <text x="64" y="318" fontSize="11" fill="var(--stone)">single-country</text>
            <text x="48" y="26" fontSize="11" fill="var(--stone)" transform="rotate(-90 48 26)" textAnchor="end">moves & grows money →</text>
            <text x="48" y="300" fontSize="11" fill="var(--stone)" transform="rotate(-90 48 300)">software only</text>
            {[
              [120, 268, 'Property-management SaaS'],
              [95, 175, 'Bank business accounts'],
              [160, 235, 'National deposit schemes'],
              [225, 255, 'Deposit-replacement insurers'],
              [180, 85, 'Goldbridge / US peers'],
            ].map(([x, y, label]) => (
              <g key={String(label)}>
                <circle cx={Number(x)} cy={Number(y)} r="4" fill="var(--stone)" />
                <text x={Number(x) + 9} y={Number(y) + 4} fontSize="12" fill="var(--ink)" opacity="0.75">{label}</text>
              </g>
            ))}
            <g>
              <circle cx="435" cy="52" r="8" fill="var(--accent)" />
              <text x="435" y="32" textAnchor="middle" fontSize="15" fill="var(--ink)" fontWeight="600">Keystone</text>
            </g>
          </svg>
        </Reveal>
        <Reveal order={2} className="self-center text-[13px] leading-relaxed">
          <ul className="space-y-3 text-[color:var(--ink)]/80">
            <li><span className="font-medium text-[color:var(--ink)]">Property-management SaaS</span> — no money movement.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Bank business accounts</span> — no rental compliance.</li>
            <li><span className="font-medium text-[color:var(--ink)]">National deposit schemes</span> — hold-only.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Deposit-replacement insurers</span> — tenant-side product.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Goldbridge / US peers</span> — validates the thesis; no European compliance engine.</li>
          </ul>
        </Reveal>
      </div>
    </div>
  )
}

// ── 08 · Team ────────────────────────────────────────────────────────────────

function PhotoPlaceholder() {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center border border-[color:var(--stone)]/50 bg-[color:var(--stone)]/10">
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden fill="none" stroke="var(--stone)" strokeWidth="1.2">
        <circle cx="12" cy="9" r="3.4" />
        <path d="M5 20 a7 7 0 0 1 14 0" />
      </svg>
    </div>
  )
}

function TeamSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Team</Kicker>
        <HeadlinePair roman="Keystone." />
      </Reveal>
      <div className="mt-10 grid grid-cols-4 gap-8">
        {deck.team.map((member, i) => (
          <Reveal key={member.name} order={i + 1}>
            <PhotoPlaceholder />
            <div className="deck-serif mt-3 text-xl leading-tight text-[color:var(--ink)]">{member.name}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
              {member.role}
            </div>
            <div className="mt-2 text-[12px] leading-relaxed text-[color:var(--stone)]">{member.line}</div>
          </Reveal>
        ))}
      </div>
      <Reveal order={5}>
        <p className="deck-serif mt-10 text-xl italic text-[color:var(--stone)]">
          Investors back people.
        </p>
      </Reveal>
    </div>
  )
}

// ── 09 · Financials ──────────────────────────────────────────────────────────

/**
 * Revenue bars (ink) + EBITDA-margin line (accent), direct-labeled. The
 * margin axis renders negatives (fixed −50…+30 range, dashed zero line); Y1
 * has no margin and is explicitly labeled with its note instead.
 */
function ForecastChart() {
  const base = 268 // bar baseline
  const marginY = (pct: number) => 58 + (30 - pct) * 2.4 // +30% → 58 · 0% → 130 · −50% → 250
  const barH = (revM: number) => Math.max(6, Math.sqrt(revM) * 26)
  const cols = deck.forecast.map((f, i) => ({ ...f, x: 96 + i * 108 }))
  const linePts = cols.filter((c) => c.ebitdaPct !== null)
  return (
    <svg viewBox="0 0 600 330" className="w-full">
      <line x1="40" y1={base} x2="580" y2={base} stroke="var(--ink)" strokeWidth="1" />
      {/* dashed zero-margin line */}
      <line x1="40" y1={marginY(0)} x2="580" y2={marginY(0)} stroke="var(--accent)" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.6" />
      <text x="42" y={marginY(0) - 5} fontSize="9" fill="var(--accent)" letterSpacing="1">
        0% EBITDA
      </text>
      <text x="40" y="46" fontSize="10" fill="var(--accent)" letterSpacing="1.5">
        EBITDA MARGIN
      </text>
      {cols.map((c) => {
        const barTop = base - barH(c.revM)
        const dotY = c.ebitdaPct === null ? null : marginY(c.ebitdaPct)
        // If the margin dot crowds the bar top, lift the value label above both.
        const labelY = dotY !== null && Math.abs(barTop - dotY) < 20 ? Math.min(barTop, dotY) - 12 : barTop - 8
        return (
        <g key={c.yr}>
          <rect x={c.x - 26} y={barTop} width="52" height={barH(c.revM)} fill="var(--ink)" opacity="0.85" />
          <text x={c.x} y={labelY} textAnchor="middle" fontSize="14" fill="var(--ink)" fontWeight="600">
            €{c.revM}M
          </text>
          <text x={c.x} y={base + 20} textAnchor="middle" fontSize="10" fill="var(--stone)" letterSpacing="1">
            {c.yr.toUpperCase()}
          </text>
          <text x={c.x} y={base + 34} textAnchor="middle" fontSize="9" fill="var(--stone)">
            {num(c.units)} units
          </text>
          {c.note && (
            <text x={c.x} y={base + 48} textAnchor="middle" fontSize="9" fill="var(--accent)" fontStyle="italic">
              {c.note}
            </text>
          )}
        </g>
        )
      })}
      <polyline
        points={linePts.map((c) => `${c.x},${marginY(c.ebitdaPct as number)}`).join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {linePts.map((c) => (
        <g key={`m-${c.yr}`}>
          <circle cx={c.x} cy={marginY(c.ebitdaPct as number)} r="4" fill="var(--accent)" />
          <text
            x={(c.ebitdaPct as number) < 0 ? c.x + 12 : c.x}
            y={marginY(c.ebitdaPct as number) + ((c.ebitdaPct as number) < 0 ? 4 : -10)}
            textAnchor={(c.ebitdaPct as number) < 0 ? 'start' : 'middle'}
            fontSize="11"
            fill="var(--accent)"
            fontWeight="600"
          >
            {(c.ebitdaPct as number) > 0 ? '+' : ''}
            {c.ebitdaPct}%
          </text>
        </g>
      ))}
    </svg>
  )
}

function FinancialsSlide() {
  const roi = deck.landlordROI
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Financials</Kicker>
        <HeadlinePair roman="Software margins." italic="On fintech revenue." size="text-4xl" />
      </Reveal>
      <div className="mt-6 grid grid-cols-[1.3fr_1fr] gap-12">
        <Reveal order={1}>
          <ForecastChart />
          <div className="mt-1 text-[11px] leading-relaxed text-[color:var(--stone)]">
            Growth via enterprise & partnership onboarding — units per contract, not one-by-one
            sales; revenue/unit rises {deck.kpis.revPerUnitPath} as card + savings adoption
            climbs.
          </div>
        </Reveal>
        <Reveal order={2} className="self-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            {deck.persona.name} profits too — per unit / yr
          </div>
          <div className="mt-3 divide-y divide-[color:var(--stone)]/25 border-y border-[color:var(--stone)]/25 text-[13px]">
            <div className="flex justify-between py-2">
              <span className="text-[color:var(--ink)]/85">Yield kept</span>
              <span className="tabular-nums">{eurInt(roi.parts.yieldKept)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[color:var(--ink)]/85">Software & accounting replaced</span>
              <span className="tabular-nums">{eurInt(roi.parts.softwareReplaced)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[color:var(--ink)]/85">Operating savings kept (75% of findings)</span>
              <span className="tabular-nums">{eurInt(roi.parts.savingsKept)}</span>
            </div>
            <div className="flex justify-between py-2 font-medium text-[color:var(--ink)]">
              <span>Value received ≈ {eurInt(roi.value)} vs fees ≈ {eurInt(roi.fees)}</span>
              <span className="text-[color:var(--accent)]">{roi.cover} cover</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--stone)]">
            The savings engine alone typically covers the subscription — we only earn when the
            landlord saves.
          </p>
        </Reveal>
      </div>
      <Reveal order={3}>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 border-t border-[color:var(--stone)]/30 pt-3 text-[12px] text-[color:var(--stone)]">
          <span>balances under management Y5 <span className="text-[color:var(--ink)]">{deck.kpis.balancesY5}</span></span>
          <span>revenue/unit <span className="text-[color:var(--ink)]">{deck.kpis.revPerUnitPath}</span></span>
          <span>gross margin <span className="text-[color:var(--ink)]">{deck.kpis.grossMarginPath}</span></span>
          <span>rate-independent <span className="text-[color:var(--ink)]">{deck.revenue.rateIndependentShare}</span></span>
          <span>CAC payback <span className="text-[color:var(--ink)]">{deck.kpis.cacPayback}</span></span>
        </div>
      </Reveal>
    </div>
  )
}

// ── 10 · Current status ──────────────────────────────────────────────────────

/** Offline QR code — matrix computed locally, rendered as inline SVG. */
function QrCode(props: { value: string; size?: number }) {
  const matrix = useMemo(() => {
    try {
      const qr = createQr(props.value, { errorCorrectionLevel: 'M' })
      const size = qr.modules.size
      const rows: boolean[][] = []
      for (let r = 0; r < size; r++) {
        const row: boolean[] = []
        for (let c = 0; c < size; c++) row.push(!!qr.modules.get(r, c))
        rows.push(row)
      }
      return rows
    } catch {
      return null
    }
  }, [props.value])
  const px = props.size ?? 108
  if (!matrix) return null
  const n = matrix.length
  return (
    <svg width={px} height={px} viewBox={`0 0 ${n} ${n}`} aria-label="QR code to the live prototype" shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#f6f2e9" />
      {matrix.flatMap((row, r) =>
        row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="var(--ink)" /> : null)),
      )}
    </svg>
  )
}

function StatusSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Current status</Kicker>
        <HeadlinePair roman="Built." italic="Ready for rails." />
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.3fr_1fr] gap-14">
        <div>
          <Reveal order={1}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">Product</div>
            <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ink)]/85">
              Functioning prototype — compliance engine, event-sourced ledger, multi-client
              environment, on partner rails as a registered agent.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              {['Engine built', 'Prototype live', 'Unit economics modeled'].map((m) => (
                <span key={m} className="border border-[color:var(--accent)] px-2 py-1 text-[color:var(--accent)]">
                  ✓ {m}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal order={2}>
            <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">Traction</div>
            <p className="mt-2 text-[13px] italic leading-relaxed text-[color:var(--stone)]">
              {deck.tractionPlaceholder}
            </p>
          </Reveal>
          <Reveal order={3}>
            <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
              Next 6–12 months
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ink)]/85">
              Sign partner bank + EMI provider · launch first markets · first landlord and
              property-manager cohorts — the {deck.persona.name}s of France and the Netherlands.
            </p>
          </Reveal>
        </div>
        <Reveal order={4} className="flex flex-col items-end justify-end">
          <div className="border border-[color:var(--stone)]/40 p-3">
            <QrCode value={deck.prototypeUrl} />
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
            See it live
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 11 · The ask ─────────────────────────────────────────────────────────────

const USE_DETAIL: Record<string, string> = {
  'Product & engineering': 'prototype → production: live rails integration, compliance rulesets hardened, savings engine v1',
  'Go-to-market': 'enterprise & partnership channels, first-market launch',
  'Regulatory & market entry': 'legal, agent registration, groundwork for the EMI step',
  'G&A': 'lean by design',
}

function AskSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>The ask</Kicker>
        <HeadlinePair
          roman={<>Raising {deck.ask.amount}.</>}
          italic={<>{deck.ask.months} months of focus.</>}
        />
      </Reveal>
      <Reveal order={1}>
        <div className="mt-10 flex h-9 w-full overflow-hidden border border-[color:var(--stone)]/40 text-[12px] text-[#f6f2e9]">
          {deck.ask.use.map(([label, pct], i) => (
            <div
              key={label}
              className="flex items-center justify-center"
              style={{
                width: `${pct}%`,
                background: ['var(--ink)', '#3c4f60', 'var(--accent)', 'var(--stone)'][i],
              }}
            >
              {pct}%
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {deck.ask.use.map(([label, pct]) => (
            <div key={label} className="flex items-baseline gap-4 text-[13px]">
              <span className="w-10 shrink-0 tabular-nums font-medium text-[color:var(--ink)]">{pct}%</span>
              <span className="w-56 shrink-0 font-medium text-[color:var(--ink)]">{label}</span>
              <span className="text-[color:var(--stone)]">{USE_DETAIL[label]}</span>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-8 border-t border-[color:var(--stone)]/30 pt-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">What it buys</div>
          <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--ink)]/85">{deck.ask.buys}</p>
        </div>
      </Reveal>
      <Reveal order={3}>
        <p className="deck-serif mt-10 text-3xl leading-snug text-[color:var(--ink)]">
          A real product, a real plan —{' '}
          <em className="text-[color:var(--accent)]">we'd love for you to be part of it.</em>
        </p>
      </Reveal>
    </div>
  )
}

// ── Appendix (Q&A only — not presented) ─────────────────────────────────────

function AppendixSlide() {
  const m = deck.marketAppendix
  return (
    <div className="text-[12px]">
      <Kicker>Appendix — for Q&A</Kicker>
      <div className="mt-6 grid grid-cols-2 gap-12">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Market data — Eurostat CP041, EU27
          </div>
          <div className="mt-3 flex gap-6 border-y border-[color:var(--stone)]/25 py-2">
            {m.actuals.map(([yr, val]) => (
              <div key={yr}>
                <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">{yr} actual</div>
                <div className="tabular-nums font-medium text-[color:var(--ink)]">{val}</div>
              </div>
            ))}
            <div className="self-center text-[color:var(--stone)]">{m.growthNote}</div>
          </div>
          <table className="mt-3 w-full">
            <thead>
              <tr className="border-b border-[color:var(--stone)]/25 text-left text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">
                {m.scenarioHeads.map((h) => (
                  <th key={h} className="py-1 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.scenarios.map((row) => (
                <tr key={row[0]} className="border-b border-[color:var(--stone)]/15">
                  {row.map((cell, i) => (
                    <td key={i} className={`py-1 pr-3 tabular-nums ${i === 0 ? 'text-[color:var(--stone)]' : 'text-[color:var(--ink)]/85'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Footnote>{m.caveat}</Footnote>

          <div className="mt-8 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Unit economics — per unit / yr
          </div>
          <div className="mt-2 text-[color:var(--ink)]/85">
            Full stack {eurInt(deck.revenue.fullStackPerUnit)} = SaaS {eurInt(deck.revenue.saas)} ·
            savings fee {eurDec(deck.revenue.savingsFee)} · NIM share {eurInt(deck.revenue.nim)} ·
            interchange {eurInt(deck.revenue.interchange)} · custody {eurInt(deck.revenue.custody)}{' '}
            (+ premium tier & supplier network). Landlord side: value ≈ {eurInt(deck.landlordROI.value)}{' '}
            vs fees ≈ {eurInt(deck.landlordROI.fees)} → {deck.landlordROI.cover} cover. Yield on
            idle balances splits owner / Keystone / partner bank under the partner collar; the NIM
            share is the only rate-linked line.
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Statutory regime table — as encoded
          </div>
          <table className="mt-3 w-full">
            <thead>
              <tr className="border-b border-[color:var(--stone)]/25 text-left text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">
                {['', 'Status', 'Deposit cap', 'Holding', 'Interest', 'Return clock'].map((h, i) => (
                  <th key={i} className="py-1 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deck.regimes.map((r) => (
                <tr key={r.code} className="border-b border-[color:var(--stone)]/15 align-top">
                  <td className="deck-serif py-1.5 pr-2 text-base text-[color:var(--ink)]">{r.code}</td>
                  <td className={`py-1.5 pr-2 ${r.status === 'Live' ? 'text-[color:var(--accent)]' : 'text-[color:var(--stone)]'}`}>{r.status}</td>
                  <td className="py-1.5 pr-2 text-[color:var(--ink)]/85">{r.cap}</td>
                  <td className="py-1.5 pr-2 text-[color:var(--ink)]/85">{r.holding}</td>
                  <td className="py-1.5 pr-2 text-[color:var(--ink)]/85">{r.interest}</td>
                  <td className="py-1.5 text-[color:var(--ink)]/85">{r.clock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Footnote>
            Versioned rules with legal references, tested like software; pricing detail on the
            business-model slide.
          </Footnote>
        </div>
      </div>
    </div>
  )
}
