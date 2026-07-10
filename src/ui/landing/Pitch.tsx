import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { create as createQr } from 'qrcode'
import { PARTNER_BANK } from '../../config'
import { deck } from '../../data/deckData'

/**
 * The pitch deck — Brief v4 content on the INTRO/Poppins system: blue-navy
 * field, WHITE typography (opacity tiers for hierarchy) with ONE red accent
 * per slide, one big INTRO title top-left per slide + ONE Poppins subtitle
 * format, decluttered supporting content. Content renders from deckData.ts.
 * Keyboard / swipe / chevrons advance; /pitch#N deep links; #12 appendix.
 */

const MAIN_COUNT = 11
const TOTAL_COUNT = 12 // + appendix, reachable past the end

const SECTION_LABELS = [
  'Title',
  'The problem',
  'Value proposition',
  'How it works',
  'Business model',
  'Go-to-market',
  'Competition',
  'Team',
  'Financials',
  'Current status',
  'The ask',
  'Appendix',
]

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

  // INTRO must never fall back silently.
  useEffect(() => {
    document.fonts.ready.then(() => {
      if (!document.fonts.check('600 1em Intro')) {
        console.error(
          '[deck] INTRO display font failed to load — headlines are rendering in the Poppins stand-in. Check public/fonts/Intro-Black-Alt.otf',
        )
      }
    })
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
    <div
      className="py-6"
      style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
    >
      <div
        ref={containerRef}
        className="deck relative w-full select-none"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
      >
        {/* Top strip — every slide: "· Keystone" + section label · slide number */}
        <div className="mx-auto w-full max-w-[1680px] px-16 pt-6">
          <div className="flex items-baseline justify-between pb-3 text-[12px] font-medium uppercase tracking-[0.21em] text-[color:var(--stone)]">
            <span>
              <span className="text-[color:var(--ink)]">· Keystone</span>
              <span className="ml-4">{SECTION_LABELS[index]}</span>
            </span>
            <span className="tabular-nums text-[color:var(--ink)]">
              {onAppendix ? 'A' : String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="h-px w-full" style={{ background: 'var(--hairline)' }} />
        </div>

        {/* Slide surface — title top-left, content flows below */}
        <div className="deck-surface mx-auto flex min-h-[70vh] w-full max-w-[1680px] items-start px-16 pb-16 pt-10">
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
        <div className="absolute bottom-4 left-16 flex items-center gap-4 text-[11px] tracking-[0.14em] text-[color:var(--stone)]">
          <span className="tabular-nums uppercase">
            {onAppendix ? 'Appendix' : `${String(index + 1).padStart(2, '0')} — ${MAIN_COUNT}`}
          </span>
          <button
            onClick={present}
            className="border border-[color:var(--hairline)] px-2 py-1 uppercase transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
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
        {/* Progress rail */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-black/5">
          <div
            className="h-full bg-[color:var(--ink)] transition-all duration-500"
            style={{ width: `${((Math.min(index, MAIN_COUNT - 1) + 1) / MAIN_COUNT) * 100}%` }}
          />
        </div>
        {/* Slide dots (clickable, main slides) */}
        <div className="absolute bottom-4 right-16 flex items-center gap-2">
          {Array.from({ length: MAIN_COUNT }, (_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? 'bg-[color:var(--ink)]' : 'bg-black/15 hover:bg-black/30'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="px-16 pt-2 text-center text-[10px] uppercase tracking-[0.14em] text-greyx">
        arrow keys · swipe · /pitch#{index + 1}
      </div>
    </div>
  )
}

// ── shared slide furniture — ONE title format, ONE subtitle format ───────────

function Reveal(props: { children: ReactNode; order?: number; className?: string }) {
  return (
    <div className={`deck-reveal ${props.className ?? ''}`} style={{ animationDelay: `${(props.order ?? 0) * 130}ms` }}>
      {props.children}
    </div>
  )
}

/** The big INTRO title — one per slide, top-left. */
function Statement(props: { children: ReactNode; size?: string; className?: string }) {
  return (
    <h2 className={`deck-intro ${props.size ?? 'text-[5.5rem]'} ${props.className ?? ''}`}>
      {props.children}
    </h2>
  )
}

/** THE one subtitle format: Poppins light in the muted tier, so the pure-
 *  white INTRO title clearly dominates. */
function Subtitle(props: { children: ReactNode; className?: string }) {
  return (
    <p className={`mt-4 max-w-4xl text-[19px] font-light leading-relaxed text-[color:var(--stone)] ${props.className ?? ''}`}>
      {props.children}
    </p>
  )
}

/** Small Poppins section sub-label for content groups. */
function Label(props: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[12px] font-medium uppercase tracking-[0.21em] text-[color:var(--stone)] ${props.className ?? ''}`}>
      {props.children}
    </div>
  )
}

function Footnote(props: { children: ReactNode }) {
  return <div className="mt-2 text-[11px] font-light leading-relaxed text-[color:var(--stone)]">{props.children}</div>
}

/** €-formatting for figures coming out of deckData. */
const eurInt = (n: number) => `€${n.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`
const eurDec = (n: number) =>
  Number.isInteger(n) ? eurInt(n) : `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => n.toLocaleString('en-IE')

// ── 01 · Title ───────────────────────────────────────────────────────────────

function TitleSlide() {
  return (
    <div className="flex min-h-[58vh] flex-col justify-between">
      <div>
        <Reveal order={0}>
          <Statement size="text-[10rem]">Keystone</Statement>
        </Reveal>
        <Reveal order={1}>
          <Subtitle>The financial operating system for European rental real estate.</Subtitle>
        </Reveal>
      </div>
      <Reveal order={2}>
        <div className="h-px w-full" style={{ background: 'var(--hairline)' }} />
        <div className="mt-5 flex items-baseline justify-between text-[15px]">
          <span className="tracking-wide text-[color:var(--body)]">{deck.founders.join(' · ')}</span>
          <span className="flex items-baseline gap-6">
            {/* the one red accent: the contact box */}
            <span className="bg-[color:var(--accent)] px-3 py-1.5 text-[12px] font-medium tracking-[0.1em] text-white">
              {deck.contactEmail}
            </span>
            <span className="text-[12px] uppercase tracking-[0.22em] text-[color:var(--stone)]">
              {deck.year}
            </span>
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
    ['Money leaking', `${deck.problem.missedIndexation}; overpaid taxes and contracts go unnoticed.`],
    ['Cash idle', deck.market.idleFraming],
    ['Risk accumulating', `${deck.problem.disputeCost}; ${deck.problem.frPenalty}.`],
  ]
  return (
    <div>
      <Reveal order={0}>
        <Statement>Built on spreadsheets.</Statement>
        <Subtitle>
          Millions of European landlords run a regulated financial business with no system built
          for it. Meet {deck.persona.name} · {deck.persona.desc} · a personal account, a
          spreadsheet, a shoebox of receipts.
        </Subtitle>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-8 text-[48px] font-semibold leading-tight tracking-tight text-[color:var(--ink)]">
          European tenants pay{' '}
          <span className="border-b-4 border-[color:var(--accent)]">{deck.market.rentActual2022}</span>{' '}
          in rent every year, and rising.
        </div>
        <div className="mt-2 text-[14px] font-light text-[color:var(--stone)]">
          growing {deck.market.rentHistGrowth} · projected {deck.market.rentProjected2026} by 2026
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-8 grid grid-cols-2 gap-x-14 gap-y-3">
          {consequences.map(([title, line]) => (
            <div key={title} className="flex gap-4 border-t border-[color:var(--hairline)] pt-2 text-[13px] leading-relaxed">
              <span className="w-40 shrink-0 font-semibold text-[color:var(--ink)]">{title}</span>
              <span className="font-light text-[color:var(--stone)]">{line}</span>
            </div>
          ))}
        </div>
        <Footnote>
          {deck.market.provenance} Hours and leakage figures: internal estimates from landlord
          interviews.
        </Footnote>
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
    <div className="max-w-5xl text-[28px] font-light leading-[1.6] text-[color:var(--body)]">
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
        <Statement>One account.</Statement>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-10">
          <WeightedValueProp />
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-12 h-px w-full" style={{ background: 'var(--hairline)' }} />
        <div className="mt-4 flex flex-wrap items-baseline gap-3 text-[15px] font-light text-[color:var(--stone)]">
          <span>personal account · spreadsheet · manual filings</span>
          <span className="text-[color:var(--body)]">→</span>
          {/* the one red accent: the destination */}
          <span className="font-medium text-[color:var(--accent)]">one Keystone account</span>
        </div>
        <div className="mt-3 text-[14px] font-light text-[color:var(--body)]">
          fewer hours · lower costs · books tax-ready · deposits handled correctly · idle cash
          earning
        </div>
      </Reveal>
    </div>
  )
}

// ── 04 · Underlying magic ────────────────────────────────────────────────────

const LEASE_CHAIN: [string, string, string][] = [
  ['T+0', 'Lease signed', 'AI reads the document; rules encode the regime.'],
  ['T+1', 'Virtual account', 'Deposit segregated at the partner bank.'],
  ['M+1', 'Rent cleared', 'The books post themselves, double-entry.'],
  ['M+6', 'Yield accrued', 'Idle balances earn at the policy rate.'],
  ['EXIT', 'Deposit returned', 'Statutory clock met; closed to the cent.'],
]

function EventChain() {
  return (
    <div>
      {LEASE_CHAIN.map(([tick, title, line], i) => (
        <div key={tick} className="relative flex gap-4 pb-5 last:pb-0">
          {i < LEASE_CHAIN.length - 1 && (
            <span className="absolute left-[5px] top-4 h-full w-px" style={{ background: 'var(--hairline)' }} />
          )}
          <span className="relative mt-1 inline-block h-[11px] w-[11px] shrink-0 rounded-full border border-[color:var(--ink)] bg-transparent" />
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
              {tick}
            </span>
            <div className="text-[16px] font-semibold leading-snug text-[color:var(--ink)]">{title}</div>
            <div className="mt-1 text-[13px] font-light leading-relaxed text-[color:var(--stone)]">{line}</div>
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
        <Statement>Deterministic core.</Statement>
        <Subtitle>Rules decide. AI only reads documents.</Subtitle>
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.2fr_1fr] gap-16">
        <Reveal order={1}>
          <div className="space-y-0">
            {[
              ['Compliance engine', 'European statutory rules-as-code. Ours; the moat.'],
              ['EMI / escrow rail', 'Moves every euro. Rented, not built.'],
              [`${PARTNER_BANK.short} vault`, 'Client funds segregated, DGS-protected.'],
            ].map(([title, line], i) => (
              <div key={title} className={`border border-[color:var(--hairline)] p-5 ${i > 0 ? 'border-t-0' : ''}`}>
                <div className="text-[18px] font-semibold text-[color:var(--ink)]">{title}</div>
                <div className="mt-1 text-[13px] font-light leading-relaxed text-[color:var(--stone)]">{line}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline gap-3 text-[13px] font-light text-[color:var(--stone)]">
            {/* the one red accent: Keystone beside the flow */}
            <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-[color:var(--accent)]">
              Keystone
            </span>
            beside the flow · money never touches our balance sheet.
          </div>
        </Reveal>
        <Reveal order={2}>
          <Label>One lease, event by event</Label>
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
    ['SaaS subscription · the core', eurInt(deck.revenue.saas)],
    ['NIM share · 27% of yield (the only rate-linked line)', eurInt(deck.revenue.nim)],
    ['Savings engine success fee · 25% of documented savings', eurDec(deck.revenue.savingsFee)],
    ['Card interchange', eurInt(deck.revenue.interchange)],
    ['Deposit custody & guarantee', eurInt(deck.revenue.custody)],
  ]
  return (
    <div>
      <Reveal order={0}>
        <div className="flex items-baseline gap-8">
          <Statement size="text-[7rem]">{eurInt(deck.revenue.fullStackPerUnit)}</Statement>
          <span className="text-[18px] font-light text-[color:var(--stone)]">per unit / yr · full stack</span>
        </div>
        <Subtitle>
          About {eurInt(deck.revenue.fullStackPerUnit)} per unit per year, from five revenue
          lines. {deck.revenue.rateIndependentShare} of revenue is rate-independent.
        </Subtitle>
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.25fr_1fr] gap-16">
        <Reveal order={1}>
          <Label>Five revenue streams · per unit / yr</Label>
          <div className="mt-3 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
            {streams.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 py-2 text-[14px]">
                <span className="font-light text-[color:var(--body)]">{label}</span>
                <span className="shrink-0 tabular-nums font-medium text-[color:var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal order={2}>
          <Label>Pricing by client</Label>
          <div className="mt-3 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
            {deck.pricing.map((p) => (
              <div key={p.segment} className="flex items-baseline justify-between gap-4 py-2 text-[14px]">
                <span className="font-light text-[color:var(--body)]">{p.segment}</span>
                <span className="shrink-0 font-light text-[color:var(--stone)]">
                  {p.plan} · <span className="tabular-nums font-medium text-[color:var(--ink)]">{eurInt(p.eurPerUnitMo)}</span>/unit/mo
                </span>
              </div>
            ))}
          </div>
          {/* the one red accent: Keystone's share of the collar */}
          <div className="mt-5 flex h-10 w-full overflow-hidden border border-[color:var(--hairline)] text-[13px]">
            <div className="flex items-center justify-center bg-[color:var(--ink)] text-[#f6f2e9]" style={{ width: '60%' }}>
              Owner 60
            </div>
            <div className="flex items-center justify-center bg-[color:var(--accent)] text-white" style={{ width: '27%' }}>
              Keystone 27
            </div>
            <div className="flex items-center justify-center text-[#0f2440]" style={{ width: '13%', background: 'rgba(15,36,64,0.15)' }}>
              Bank 13
            </div>
          </div>
          <div className="mt-2 text-[12px] font-light text-[color:var(--stone)]">
            per €100 of yield on idle balances
          </div>
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
        <Statement>Clean markets first.</Statement>
        <Subtitle>
          One partnership → thousands of units. Units arrive by contract, not one-by-one.
        </Subtitle>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-10 flex items-center gap-0">
          {[
            ['First', 'France · Netherlands · Spain', 'deposit float investable, compliance pain acute'],
            ['Then', 'Expansion across Europe', 'the engine speaks each statute before the sales team arrives'],
          ].map(([when, markets, line], i) => (
            <div key={String(when)} className="flex flex-1 items-center">
              {i > 0 && <span className="px-4 text-[color:var(--stone)]">→</span>}
              <div className="flex-1 border-t border-[color:var(--ink)] pt-3">
                {/* the one red accent: the phase we start in */}
                <div className={`text-[11px] font-medium uppercase tracking-[0.2em] ${i === 0 ? 'text-[color:var(--accent)]' : 'text-[color:var(--stone)]'}`}>
                  {when}
                </div>
                <div className="mt-1 text-[30px] font-semibold text-[color:var(--ink)]">{markets}</div>
                <div className="mt-1 text-[13px] font-light leading-relaxed text-[color:var(--stone)]">{line}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-12 flex divide-x divide-[color:var(--hairline)] border-y border-[color:var(--hairline)] text-[13px]">
          {[
            ['Property managers', 'hundreds of units per contract'],
            ['Software integrations', 'embedded as the financial layer'],
            ['Landlord associations', 'the trusted route to owners'],
            ['Partner-bank SME channel', 'the bank refers its landlords'],
          ].map(([channel, line]) => (
            <div key={channel} className="flex-1 px-4 py-3">
              <div className="font-medium text-[color:var(--ink)]">{channel}</div>
              <div className="mt-1 font-light text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  )
}

// ── 07 · Competition ─────────────────────────────────────────────────────────

function CompetitionSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Statement>A slice each.</Statement>
        <Subtitle>
          {deck.competition.headline.roman} {deck.competition.headline.italic}
        </Subtitle>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-8 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]">
          {deck.competition.tiers.map((tier, i) => (
            <div key={tier.tier} className="grid grid-cols-[240px_1fr_1.2fr] items-baseline gap-8 py-3">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--stone)]">
                  Tier {i + 1}
                  {tier.closest && <span className="ml-2 text-[color:var(--ink)]">closest</span>}
                </div>
                <div className="mt-1 text-[17px] font-semibold leading-snug text-[color:var(--ink)]">{tier.tier}</div>
              </div>
              <div className="text-[13px] leading-relaxed text-[color:var(--body)]">{tier.names}</div>
              <div className="text-[13px] font-light leading-relaxed text-[color:var(--stone)]">{tier.does}</div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        {/* the one red accent: the Keystone moat line */}
        <p className="mt-8 max-w-5xl text-[18px] font-medium leading-relaxed text-[color:var(--accent)]">
          {deck.competition.moat}
        </p>
      </Reveal>
    </div>
  )
}

// ── 08 · Team ────────────────────────────────────────────────────────────────

function PhotoPlaceholder() {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center border border-[color:var(--hairline)] bg-black/5">
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden fill="none" stroke="rgba(15,36,64,0.4)" strokeWidth="1.2">
        <circle cx="12" cy="9" r="3.4" />
        <path d="M5 20 a7 7 0 0 1 14 0" />
      </svg>
    </div>
  )
}

/** Founder headshot from public/photos — falls back to the neutral
 *  placeholder while the file is missing. Consistent 4:5 crop. */
function FounderPhoto(props: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <PhotoPlaceholder />
  return (
    <img
      src={props.src}
      alt={props.name}
      className="aspect-[4/5] w-full border border-[color:var(--hairline)] object-cover object-top"
      onError={() => setFailed(true)}
    />
  )
}

function TeamSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Statement>The team.</Statement>
        <Subtitle>Investors back people.</Subtitle>
      </Reveal>
      <div className="mt-10 grid grid-cols-4 gap-10">
        {deck.team.map((member, i) => (
          <Reveal key={member.name} order={i + 1}>
            <FounderPhoto src={member.photo} name={member.name} />
            <div className="mt-3 text-[19px] font-semibold leading-tight text-[color:var(--ink)]">{member.name}</div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--stone)]">
              {member.role}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

// ── 09 · Financials ──────────────────────────────────────────────────────────

/**
 * Revenue bars (white) + EBITDA-margin line (red), direct-labeled on navy.
 * Margin axis renders negatives (−50…+30, dashed zero line); Y1 has no
 * margin and carries its note instead.
 */
function ForecastChart() {
  // Bars sit LOW (base 284, compressed sqrt scale) so every value label fits
  // centered above its bar with clearance from the margin line — the Y2 dot
  // (−40%) passes above the €2.1M label, never through it.
  const base = 284
  const marginY = (pct: number) => 58 + (30 - pct) * 2.4
  const barH = (revM: number) => Math.max(6, Math.sqrt(revM) * 18)
  const cols = deck.forecast.map((f, i) => ({ ...f, x: 96 + i * 108 }))
  const linePts = cols.filter((c) => c.ebitdaPct !== null)
  return (
    <svg viewBox="0 0 600 348" className="w-full">
      <line x1="40" y1={base} x2="580" y2={base} stroke="var(--stone)" strokeWidth="1" />
      <line x1="40" y1={marginY(0)} x2="580" y2={marginY(0)} stroke="var(--accent)" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.7" />
      <text x="42" y={marginY(0) - 5} fontSize="9" fill="var(--accent)" letterSpacing="1">
        0% EBITDA
      </text>
      <text x="40" y="52" fontSize="10" fill="var(--accent)" letterSpacing="1.5">
        EBITDA MARGIN
      </text>
      {cols.map((c) => {
        const barTop = base - barH(c.revM)
        return (
          <g key={c.yr}>
            <rect x={c.x - 26} y={barTop} width="52" height={barH(c.revM)} fill="var(--ink)" opacity="0.92" />
            <text x={c.x} y={barTop - 8} textAnchor="middle" fontSize="15" fill="var(--ink)" fontWeight="600">
              €{c.revM}M
            </text>
            <text x={c.x} y={base + 20} textAnchor="middle" fontSize="10" fill="var(--stone)" letterSpacing="1">
              {c.yr.toUpperCase()}
            </text>
            <text x={c.x} y={base + 34} textAnchor="middle" fontSize="9" fill="var(--stone)">
              {num(c.units)} units
            </text>
            {c.note && (
              <text x={c.x} y={base + 48} textAnchor="middle" fontSize="9" fill="var(--body)" fontStyle="italic">
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
        <Statement>Five years.</Statement>
        <Subtitle>
          Growth by contract, not one-by-one sales · revenue/unit rises {deck.kpis.revPerUnitPath}.
        </Subtitle>
      </Reveal>
      <div className="mt-6 grid grid-cols-[1.3fr_1fr] gap-14">
        <Reveal order={1}>
          <ForecastChart />
        </Reveal>
        <Reveal order={2} className="self-center">
          <Label>{deck.persona.name} profits too · per unit / yr</Label>
          <div className="mt-3 divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)] text-[14px]">
            <div className="flex justify-between py-2">
              <span className="font-light text-[color:var(--body)]">Yield kept</span>
              <span className="tabular-nums">{eurInt(roi.parts.yieldKept)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-light text-[color:var(--body)]">Software & accounting replaced</span>
              <span className="tabular-nums">{eurInt(roi.parts.softwareReplaced)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-light text-[color:var(--body)]">Operating savings kept</span>
              <span className="tabular-nums">{eurInt(roi.parts.savingsKept)}</span>
            </div>
            <div className="flex justify-between py-2 font-medium text-[color:var(--ink)]">
              <span>Value ≈ {eurInt(roi.valueReceived)} vs fees ≈ {eurInt(roi.feesPaid)}</span>
              <span>{roi.cover}</span>
            </div>
          </div>
          <p className="mt-3 text-[13px] font-light leading-relaxed text-[color:var(--stone)]">
            The savings engine alone typically covers the subscription.
          </p>
        </Reveal>
      </div>
      <Reveal order={3}>
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-1 border-t border-[color:var(--hairline)] pt-3 text-[13px] font-light text-[color:var(--stone)]">
          <span>balances Y5 <span className="font-normal text-[color:var(--ink)]">{deck.kpis.balancesY5}</span></span>
          <span>revenue/unit <span className="font-normal text-[color:var(--ink)]">{deck.kpis.revPerUnitPath}</span></span>
          <span>gross margin <span className="font-normal text-[color:var(--ink)]">{deck.kpis.grossMarginPath}</span></span>
          <span>rate-independent <span className="font-normal text-[color:var(--ink)]">{deck.revenue.rateIndependentShare}</span></span>
          <span>CAC payback <span className="font-normal text-[color:var(--ink)]">{deck.kpis.cacPayback}</span></span>
        </div>
      </Reveal>
    </div>
  )
}

// ── 10 · Current status ──────────────────────────────────────────────────────

/** Offline QR code — white tile so it scans on the navy field. */
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
  const px = props.size ?? 116
  if (!matrix) return null
  const n = matrix.length
  return (
    <svg width={px} height={px} viewBox={`0 0 ${n} ${n}`} aria-label="QR code to the live prototype" shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#ffffff" />
      {matrix.flatMap((row, r) =>
        row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f2440" /> : null)),
      )}
    </svg>
  )
}

function StatusSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Statement>Built.</Statement>
        <Subtitle>
          Functioning prototype: compliance engine, event-sourced ledger, multi-client
          environment, on partner rails as a registered agent.
        </Subtitle>
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.3fr_1fr] gap-16">
        <div>
          <Reveal order={1}>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {/* the one red accent: the done-marks */}
              {['Engine built', 'Prototype live', 'Unit economics modeled'].map((m) => (
                <span key={m} className="border border-[color:var(--accent)] px-2 py-1 text-[color:var(--accent)]">
                  ✓ {m}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal order={2}>
            <Label className="mt-6">Next 6 to 12 months</Label>
            <p className="mt-2 text-[14px] font-light leading-relaxed text-[color:var(--body)]">
              Sign partner bank + EMI provider · launch first markets · first landlord and
              property-manager cohorts · the {deck.persona.name}s of France and the Netherlands.
            </p>
          </Reveal>
        </div>
        <Reveal order={3} className="flex flex-col items-end justify-end">
          <div className="border border-[color:var(--hairline)] p-3">
            <QrCode value={deck.prototypeUrl} />
          </div>
          <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--stone)]">
            See it live
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 11 · The ask ─────────────────────────────────────────────────────────────

function AskSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Statement>The ask.</Statement>
        <Subtitle>
          Raising {deck.ask.amount} · {deck.ask.months} months runway to first revenue.
        </Subtitle>
      </Reveal>
      <Reveal order={1}>
        {/* use-of-funds: the visual anchor — red lead segment, navy steps;
            each segment reads share AND amount at once */}
        <div className="mt-8 flex h-10 w-full overflow-hidden border border-[color:var(--hairline)] text-[12px]">
          {deck.ask.use.map((u, i) => (
            <div
              key={u.label}
              className={`flex items-center justify-center gap-2 whitespace-nowrap ${i <= 1 ? 'text-[#f6f2e9]' : 'text-[#0f2440]'}`}
              style={{
                width: `${u.pct}%`,
                background: ['var(--accent)', '#0f2440', 'rgba(15,36,64,0.35)', 'rgba(15,36,64,0.15)'][i],
              }}
            >
              <span className="font-medium tabular-nums">{u.pct}%</span>
              {u.pct >= 15 && <span className="font-light tabular-nums">{u.amount}</span>}
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-14 gap-y-4">
          {deck.ask.use.map((u) => (
            <div key={u.label}>
              <div className="text-[14px] font-medium text-[color:var(--ink)]">
                {u.label} · {u.pct}% <span className="font-light">({u.amount})</span>
              </div>
              <p className="mt-1 text-[12.5px] font-light leading-relaxed text-[color:var(--stone)]">{u.detail}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-8 grid grid-cols-2 gap-14 border-t border-[color:var(--hairline)] pt-4">
          <div>
            <Label>What it buys</Label>
            <p className="mt-2 text-[14px] font-light leading-relaxed text-[color:var(--body)]">{deck.ask.buys}</p>
          </div>
          <div>
            <Label>What investors get</Label>
            <p className="mt-2 text-[14px] font-light leading-relaxed text-[color:var(--body)]">{deck.ask.investorsGet}</p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

// ── Appendix (Q&A only — not presented) ─────────────────────────────────────

function AppendixSlide() {
  const m = deck.marketAppendix
  return (
    <div className="text-[12px]">
      <Label>Appendix · for Q&A</Label>
      <div className="mt-6 grid grid-cols-2 gap-14">
        <div>
          <Label>Market data · Eurostat CP041, EU27</Label>
          <div className="mt-3 flex gap-6 border-y border-[color:var(--hairline)] py-2">
            {m.actuals.map(([yr, val]) => (
              <div key={yr}>
                <div className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">{yr} actual</div>
                <div className="tabular-nums font-medium text-[color:var(--ink)]">{val}</div>
              </div>
            ))}
            <div className="self-center font-light text-[color:var(--stone)]">{m.growthNote}</div>
          </div>
          <table className="mt-3 w-full">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-left text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">
                {m.scenarioHeads.map((h) => (
                  <th key={h} className="py-1 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.scenarios.map((row) => (
                <tr key={row[0]} className="border-b border-[color:var(--hairline)]">
                  {row.map((cell, i) => (
                    <td key={i} className={`py-1 pr-3 tabular-nums ${i === 0 ? 'text-[color:var(--stone)]' : 'text-[color:var(--body)]'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Footnote>{m.caveat}</Footnote>

          <Label className="mt-8">The math · A · business model, {eurInt(deck.revenue.fullStackPerUnit)}/unit/yr</Label>
          <div className="mt-2 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.math.model.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Label className="mt-5">The math · B · {deck.persona.name} ROI (mid landlord, Pro)</Label>
          <div className="mt-2 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.math.roi.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Label className="mt-5">The math · C · financials derivation</Label>
          <div className="mt-2 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.math.financials.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Label className="mt-5">The math · D · five-year forecast</Label>
          <div className="mt-2 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.math.forecastDetail.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Label className="mt-5">The math · E · key-metrics derivation</Label>
          <div className="mt-2 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.math.metrics.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
        <div>
          <Label>Statutory regime table · as encoded</Label>
          <table className="mt-3 w-full">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-left text-[10px] uppercase tracking-[0.1em] text-[color:var(--stone)]">
                {['', 'Status', 'Deposit cap', 'Holding', 'Interest', 'Return clock'].map((h, i) => (
                  <th key={i} className="py-1 pr-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deck.regimes.map((r) => (
                <tr key={r.code} className="border-b border-[color:var(--hairline)] align-top">
                  <td className="py-1.5 pr-2 text-[14px] font-semibold text-[color:var(--ink)]">{r.code}</td>
                  <td className={`py-1.5 pr-2 ${r.status === 'Live' ? 'text-[color:var(--ink)]' : 'text-[color:var(--stone)]'}`}>{r.status}</td>
                  <td className="py-1.5 pr-2 font-light text-[color:var(--body)]">{r.cap}</td>
                  <td className="py-1.5 pr-2 font-light text-[color:var(--body)]">{r.holding}</td>
                  <td className="py-1.5 pr-2 font-light text-[color:var(--body)]">{r.interest}</td>
                  <td className="py-1.5 font-light text-[color:var(--body)]">{r.clock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Footnote>
            Versioned rules with legal references, tested like software.
          </Footnote>

          <Label className="mt-8">F · how the {deck.ask.amount} ask was derived</Label>
          <p className="mt-2 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            {deck.askDerivation.intro}
          </p>
          <div className="mt-3">
            {deck.askDerivation.groups.map((g) => (
              <div key={g.group} className="mb-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--stone)]">
                  {g.group}
                </div>
                {g.items.map(([label, amount, pct]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 border-b border-[color:var(--hairline)] py-1 text-[11px]">
                    <span className="font-light text-[color:var(--body)]">{label}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-medium text-[color:var(--ink)]">{amount}</span>
                      <span className="ml-2 font-light text-[color:var(--stone)]">{pct}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 py-1 text-[11px] font-medium text-[color:var(--ink)]">
              <span>{deck.askDerivation.total[0]}</span>
              <span className="tabular-nums">
                {deck.askDerivation.total[1]}
                <span className="ml-2">{deck.askDerivation.total[2]}</span>
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-[11px] font-light leading-relaxed text-[color:var(--body)]">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--stone)]">
              Reconciliation to the Slide 11 functional split (50 / 30 / 15 / 5)
            </div>
            {deck.askDerivation.reconciliation.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <Footnote>{deck.askDerivation.confirm}</Footnote>
        </div>
      </div>
    </div>
  )
}
