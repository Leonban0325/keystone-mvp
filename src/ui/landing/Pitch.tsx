import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CountUp } from '../components'
import { PARTNER_BANK } from '../../config'

/**
 * The pitch deck (Addendum I, design language per the warm-institutional
 * direction): Kawasaki's ten slides — display-serif roman/italic headline
 * pairs, wide-caps kickers, ivory base with ONE dark slide (04), muted
 * green as the single accent, signature components (event-chain timeline,
 * 2×2 positioning plot, combo chart) as slide visuals. Every figure
 * reconciles to the business-model documents. Keyboard / swipe / chevrons
 * advance; slides deep-link as /pitch#N; Present goes fullscreen.
 */

const SLIDE_COUNT = 10
const DARK_SLIDE = 3 // slide 04 — the one deliberate tonal shift

export default function Pitch() {
  const [index, setIndex] = useState(() => {
    const n = Number(window.location.hash.replace('#', ''))
    return Number.isInteger(n) && n >= 1 && n <= SLIDE_COUNT ? n - 1 : 0
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, next)))
  }, [])

  // Deep links: /pitch#3 ↔ slide 3.
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}#${index + 1}`)
  }, [index])
  useEffect(() => {
    const onHash = () => {
      const n = Number(window.location.hash.replace('#', ''))
      if (Number.isInteger(n) && n >= 1 && n <= SLIDE_COUNT) setIndex(n - 1)
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
      if (e.key === 'End') go(SLIDE_COUNT - 1)
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
    <ModelSlide key="s5" active={index === 4} />,
    <GtmSlide key="s6" />,
    <CompetitionSlide key="s7" />,
    <TeamSlide key="s8" />,
    <FinancialsSlide key="s9" />,
    <AskSlide key="s10" />,
  ]

  const dark = index === DARK_SLIDE

  return (
    <div className="-mx-6 py-6">
      <div
        ref={containerRef}
        className={`deck relative w-full select-none border-y rule ${dark ? 'deck-dark' : ''}`}
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

        {/* Chrome: chevrons, counter, progress rail, present */}
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
          disabled={index === SLIDE_COUNT - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-4 text-2xl text-[color:var(--stone)] transition-colors hover:text-[color:var(--ink)] disabled:opacity-20"
        >
          ›
        </button>
        <div className="absolute bottom-4 left-10 flex items-center gap-4 text-[11px] tracking-[0.14em] text-[color:var(--stone)]">
          <span className="tabular-nums">
            {String(index + 1).padStart(2, '0')} — {SLIDE_COUNT}
          </span>
          <button
            onClick={present}
            className="border border-[color:var(--stone)] px-2 py-1 uppercase transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
          >
            Present
          </button>
        </div>
        {/* Progress rail */}
        <div className={`absolute bottom-0 left-0 h-[2px] w-full ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
          <div
            className="h-full bg-[color:var(--accent)] transition-all duration-500"
            style={{ width: `${((index + 1) / SLIDE_COUNT) * 100}%` }}
          />
        </div>
        {/* Slide dots (clickable) */}
        <div className="absolute bottom-4 right-10 flex gap-2">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index
                  ? 'bg-[color:var(--accent)]'
                  : dark
                    ? 'bg-white/20 hover:bg-white/40'
                    : 'bg-black/15 hover:bg-black/30'
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
    <h2 className={`deck-serif mt-3 ${props.size ?? 'text-6xl'} font-medium leading-[1.1] text-[color:var(--ink)]`}>
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

function ArchLarge(props: { size?: number }) {
  const s = props.size ?? 72
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

/** Signature component: the event-chain timeline (a lease's life). */
const LEASE_CHAIN: [string, string, string][] = [
  ['T+0', 'Lease signed', 'AI reads the document; rules encode the regime.'],
  ['T+1', 'Virtual IBAN', 'Per-lease collection; deposit segregated at the partner bank.'],
  ['M+1', 'Rent cleared', 'SEPA settles; the books post themselves, double-entry.'],
  ['M+6', 'Yield accrued', 'Idle balances earn; the owner keeps ~60% of every basis point.'],
  ['EXIT', 'Deposit returned', 'The statutory clock runs; the ledger closes to the cent.'],
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

// ── 01 · Title ───────────────────────────────────────────────────────────────

function TitleSlide() {
  return (
    <div className="flex min-h-[62vh] flex-col justify-end">
      <Reveal order={0} className="absolute right-10 top-10">
        <ArchLarge size={56} />
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
          <span className="tracking-wide">
            Leon Ban · Duong Bui · Mark Gebrane · Bariah Al-besharah
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--stone)]">
            HEC Startup Competition · 2026
          </span>
        </div>
      </Reveal>
    </div>
  )
}

// ── 02 · Problem / Opportunity ───────────────────────────────────────────────

const REGIME_RULES: [string, string][] = [
  ['FR', 'cap 1 month · 10%/mo late penalty'],
  ['NL', 'cap 2 months · 14-day return'],
  ['ES', 'fianza lodged with the region'],
  ['DE', '3× cold rent · tenant interest'],
  ['AT', 'separate secure holding'],
  ['IT', 'cap 3 months · legal-rate interest'],
]

function ProblemSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>The problem</Kicker>
        <HeadlinePair roman="A regulated business." italic="Run on spreadsheets." />
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-14">
        <Reveal order={1}>
          <p className="text-[15px] leading-relaxed text-[color:var(--ink)]/80">
            Rent lands in a personal account. Deposits sit frozen at 0% — held six different
            ways in six countries. At tax time it becomes a spreadsheet; one missed deadline is
            a fine or a lost deposit. For the people who house Europe, the finances of housing
            are still handmade.
          </p>
          <div className="mt-6 divide-y divide-[color:var(--stone)]/30 border-y border-[color:var(--stone)]/30">
            {REGIME_RULES.map(([code, rule]) => (
              <div key={code} className="flex items-baseline gap-4 py-2 text-[13px]">
                <span className="deck-serif w-8 text-lg font-medium text-[color:var(--ink)]">{code}</span>
                <span className="text-[color:var(--stone)]">{rule}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
            The inconsistency is the argument
          </div>
        </Reveal>
        <Reveal order={2} className="self-center border-l border-[color:var(--stone)]/40 pl-14">
          <div className="deck-serif text-7xl font-medium text-[color:var(--accent)]">&gt;€1 trillion</div>
          <div className="mt-2 text-sm uppercase tracking-[0.14em] text-[color:var(--stone)]">
            of rent flows through Europe every year
          </div>
          <div className="deck-serif mt-10 text-5xl font-medium text-[color:var(--ink)]">~25%</div>
          <div className="mt-2 text-sm uppercase tracking-[0.14em] text-[color:var(--stone)]">
            sits idle at any moment — deposits & reserves
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 03 · Value Proposition ───────────────────────────────────────────────────

function ValueSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>The answer</Kicker>
        <HeadlinePair roman="One account." italic="Legal by construction." />
      </Reveal>
      <div className="mt-12 grid grid-cols-[1fr_80px_1fr] items-center gap-0">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">Before</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Bank account', 'Spreadsheet', 'Agency filing', 'Tenant chase', 'Vendor invoices', 'Deposit paperwork'].map(
              (item, i) => (
                <span
                  key={item}
                  className="border border-[color:var(--stone)]/50 px-3 py-2 text-[13px] text-[color:var(--stone)]"
                  style={{ transform: `rotate(${[-1.4, 1.1, -0.7, 1.6, -1.1, 0.8][i]}deg)` }}
                >
                  {item}
                </span>
              ),
            )}
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-[color:var(--stone)]">
            Disconnected tools, none of which know what a lease is — reconciled by hand, at
            night, at tax time.
          </p>
        </Reveal>
        <Reveal order={2} className="text-center text-2xl text-[color:var(--stone)]">
          →
        </Reveal>
        <Reveal order={3}>
          <div className="border border-[color:var(--accent)] p-6">
            <div className="deck-serif text-2xl font-medium text-[color:var(--accent)]">Keystone</div>
            <div className="mt-4 divide-y divide-[color:var(--stone)]/25">
              {[
                ['Rent', 'collects itself, dunning included'],
                ['Deposit', 'held per statute, automatically'],
                ['Yield', 'idle cash earns — owners keep ~60%'],
                ['Books', 'double-entry, to the cent'],
                ['Savings', 'five detectors, success-fee only'],
              ].map(([label, line]) => (
                <div key={label} className="flex items-baseline gap-3 py-2 text-[13px]">
                  <span className="w-16 shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink)]">
                    {label}
                  </span>
                  <span className="text-[color:var(--stone)]">{line}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-[13px] italic text-[color:var(--stone)]">The relief of simplicity.</p>
        </Reveal>
      </div>
    </div>
  )
}

// ── 04 · Underlying Magic — the ONE dark slide ───────────────────────────────

function MagicSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>How it works</Kicker>
        <HeadlinePair roman="Deterministic core." italic="Probabilistic edges." />
      </Reveal>
      <div className="mt-12 grid grid-cols-[1.2fr_1fr] gap-16">
        <Reveal order={1}>
          <div className="space-y-0">
            {[
              ['Compliance engine', 'Six statutory regimes as versioned rules — caps, clocks, lodgement, interest. Ours.'],
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
            Rules decide. <span className="text-[color:var(--ink)]">AI only reads documents.</span>
          </p>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--stone)]">
            A lease, event by event
          </div>
          <div className="mt-4">
            <EventChain />
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 05 · Business Model ──────────────────────────────────────────────────────

const REVENUE_LINES = [
  'SaaS subscription per unit',
  'Treasury yield share',
  'Deposit custody',
  'Card interchange',
  'Savings success fees',
  'Bookkeeping & documents',
  'Partner & platform revenue share',
]

function ModelSlide(props: { active: boolean }) {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Business model</Kicker>
        <div className="deck-serif mt-3 text-8xl font-medium text-[color:var(--accent)]">
          {props.active ? <CountUp value={225} format={(v) => `€${Math.round(v)}`} /> : '€225'}
          <span className="deck-serif text-4xl italic text-[color:var(--stone)]"> per unit. Per year.</span>
        </div>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-14">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Seven revenue lines
          </div>
          <ul className="mt-3 space-y-2 text-[15px] text-[color:var(--ink)]/85">
            {REVENUE_LINES.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
          <div className="mt-5 text-[13px] text-[color:var(--stone)]">
            Core unit revenue ≈ €172 — of which ~€96 durable, rate-independent.
          </div>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Per €100 of yield on idle balances
          </div>
          <div className="mt-4 flex h-11 w-full overflow-hidden border border-[color:var(--stone)]/40">
            <div className="flex items-center justify-center bg-[color:var(--ink)] text-[13px] text-[#f6f2e9]" style={{ width: '60%' }}>
              Owner 60
            </div>
            <div className="flex items-center justify-center bg-[color:var(--accent)] text-[13px] text-[#f6f2e9]" style={{ width: '27%' }}>
              Keystone 27
            </div>
            <div className="flex items-center justify-center bg-[color:var(--stone)] text-[13px] text-[#f6f2e9]" style={{ width: '13%' }}>
              Bank 13
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-[color:var(--stone)]">
            A three-way collar: owners keep ~60% of every basis point — the yield pays for the
            software, and the account gets stickier as rates move.
          </p>
          <p className="mt-4 border-t border-[color:var(--stone)]/30 pt-3 text-[13px] text-[color:var(--ink)]/80">
            ~Two-thirds of revenue is rate-independent — the floor holds when rates fall.
          </p>
        </Reveal>
      </div>
    </div>
  )
}

// ── 06 · Go-to-Market ────────────────────────────────────────────────────────

function GtmSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Go-to-market</Kicker>
        <HeadlinePair roman="Clean-yield markets first." italic="Enterprise scales it." />
      </Reveal>
      <Reveal order={1}>
        <div className="mt-12 flex items-center gap-0">
          {[
            ['Phase 1', 'FR · NL · ES', 'deposit float investable, compliance pain acute'],
            ['Phase 2', 'PL · PT', 'high rental growth, fragmented tooling'],
            ['Phase 3', 'DE · AT · IT', 'the big pool — engine already speaks §551 BGB'],
          ].map(([phase, markets, line], i) => (
            <div key={String(phase)} className="flex flex-1 items-center">
              {i > 0 && <span className="px-3 text-[color:var(--stone)]">→</span>}
              <div className="flex-1 border-t border-[color:var(--ink)] pt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">{phase}</div>
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
            ['Letting agents', 'the trusted local channel'],
            ['Property managers', '850 units per contract'],
            ['Software integrations', 'embedded as the financial layer'],
            ['Partner-bank channel', 'the bank refers its landlords'],
          ].map(([channel, line]) => (
            <div key={channel} className="flex-1 px-4 py-3">
              <div className="font-medium text-[color:var(--ink)]">{channel}</div>
              <div className="mt-1 text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px] text-[color:var(--stone)]">
          One partnership → <span className="text-[color:var(--ink)]">thousands of units</span>.
          Distribution over door-knocking.
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
              [120, 268, 'PMS software'],
              [95, 175, 'Bank accounts'],
              [160, 235, 'National deposit schemes'],
              [225, 255, 'Deposit-replacement insurers'],
              [180, 85, 'Goldbridge (US)'],
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
            <li><span className="font-medium text-[color:var(--ink)]">PMS software</span> — manages the property, never the money.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Bank accounts</span> — money, one country, no idea what a lease is.</li>
            <li><span className="font-medium text-[color:var(--ink)]">National deposit schemes</span> — hold-only, one regime each, no yield.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Deposit-replacement insurers</span> — tenant-side product, no account.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Goldbridge (US)</span> — validates the thesis; no European engine.</li>
          </ul>
        </Reveal>
      </div>
    </div>
  )
}

// ── 08 · Team ────────────────────────────────────────────────────────────────

const FOUNDERS: [string, string][] = [
  ['Leon Ban', 'Product & engineering — built the compliance engine and ledger'],
  ['Duong Bui', 'Finance & treasury — the yield model and unit economics'],
  ['Mark Gebrane', 'Growth & partnerships — channels, agents, platforms'],
  ['Bariah Al-besharah', 'Regulatory & operations — the licence ladder, KYC/AML'],
]

function TeamSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Team</Kicker>
        <HeadlinePair roman="Keystone." />
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-x-14 gap-y-10">
        {FOUNDERS.map(([name, line], i) => (
          <Reveal key={name} order={i + 1}>
            <div className="border-t border-[color:var(--stone)]/40 pt-4">
              <div className="deck-serif text-3xl text-[color:var(--ink)]">{name}</div>
              <div className="mt-2 text-[13px] leading-relaxed text-[color:var(--stone)]">{line}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal order={5}>
        <p className="deck-serif mt-12 text-xl italic text-[color:var(--stone)]">
          Investors back people. Housing is where Europeans keep their money and their lives —
          it deserves infrastructure built with the same care.
        </p>
      </Reveal>
    </div>
  )
}

// ── 09 · Financials ──────────────────────────────────────────────────────────

const PER_UNIT: [string, number][] = [
  ['Small landlord', 177],
  ['Mid landlord', 249],
  ['Property manager', 203],
  ['Housing assoc.', 124],
  ['Institutional BTR', 264],
]

/** Signature component: revenue bars (ink) + EBITDA-margin line (green). */
function ComboChart() {
  // Two clean bands: bars live below y≈110, the margin line above — no label
  // ever collides. Bar heights on a sqrt scale so €4.5M is still legible
  // beside €239M; margin line on its own 0–55% scale.
  const points: { x: number; label: string; revenue: string; margin: string; barH: number; marginY: number }[] = [
    { x: 110, label: 'Seed', revenue: '€4.5M', margin: 'breakeven', barH: 20, marginY: 145 },
    { x: 260, label: 'Series A', revenue: '€21.4M', margin: '24%', barH: 43, marginY: 95 },
    { x: 410, label: 'Scale', revenue: '€239M', margin: '48%', barH: 140, marginY: 45 },
  ]
  return (
    <svg viewBox="0 0 520 290" className="w-full">
      <line x1="40" y1="250" x2="490" y2="250" stroke="var(--ink)" strokeWidth="1" />
      {points.map((p) => (
        <g key={p.label}>
          <rect x={p.x - 34} y={250 - p.barH} width="68" height={p.barH} fill="var(--ink)" opacity="0.85" />
          <text x={p.x} y={250 - p.barH - 10} textAnchor="middle" fontSize="16" fill="var(--ink)" fontWeight="600">
            {p.revenue}
          </text>
          <text x={p.x} y="270" textAnchor="middle" fontSize="11" fill="var(--stone)" letterSpacing="1.5">
            {p.label.toUpperCase()}
          </text>
        </g>
      ))}
      <polyline
        points={points.map((p) => `${p.x},${p.marginY}`).join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {points.map((p) => (
        <g key={`m-${p.label}`}>
          <circle cx={p.x} cy={p.marginY} r="4" fill="var(--accent)" />
          <text x={p.x} y={p.marginY - 12} textAnchor="middle" fontSize="12" fill="var(--accent)" fontWeight="600">
            {p.margin}
          </text>
        </g>
      ))}
      <text x="40" y="52" fontSize="10" fill="var(--accent)" letterSpacing="1.5">
        EBITDA MARGIN
      </text>
    </svg>
  )
}

function FinancialsSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Financials</Kicker>
        <HeadlinePair roman="Software margins." italic="On fintech revenue." />
      </Reveal>
      <div className="mt-8 grid grid-cols-[1.15fr_1fr] gap-14">
        <Reveal order={1}>
          <ComboChart />
        </Reveal>
        <Reveal order={2} className="self-center">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Revenue per unit per year, by client type
          </div>
          <div className="mt-4 divide-y divide-[color:var(--stone)]/25 border-y border-[color:var(--stone)]/25">
            {PER_UNIT.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between py-2 text-[14px]">
                <span className="text-[color:var(--ink)]/80">{label}</span>
                <span className="tabular-nums font-medium text-[color:var(--ink)]">€{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[13px] text-[color:var(--stone)]">
            Blended ≈ €225 across the mix — the same model the product reconciles against.
          </div>
        </Reveal>
      </div>
      <Reveal order={3}>
        <div className="mt-6 text-xs text-[color:var(--stone)]">
          Steady-state at each milestone, not cumulative · ECB deposit facility 2.25% · growth
          carried by units under management and per-unit adoption, not price.
        </div>
      </Reveal>
    </div>
  )
}

// ── 10 · Status & The Ask ────────────────────────────────────────────────────

function AskSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Status</Kicker>
        <HeadlinePair roman="Built." italic="Climbing the licence ladder." />
      </Reveal>
      <Reveal order={1}>
        {/* The ascending three-step line — each step visibly higher. */}
        <div className="mt-12 grid grid-cols-3 items-end gap-0">
          {[
            ['Now', 'Working prototype', 'six-regime compliance engine · multi-persona · PSD2 agent on partner rails', true, 0],
            ['Series A', 'Own the EMI', 'the payment layer in-house — interchange, margin and control, not a fee', false, 44],
            ['At scale', 'Banking licence', 'when retained margin beats the cost of capital', false, 88],
          ].map(([when, step, line, done, rise]) => (
            <div key={String(step)} style={{ marginBottom: Number(rise) }}>
              <div className="border-t-2 border-[color:var(--ink)] pt-3 pr-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--stone)]">{when}</div>
                <div className="deck-serif mt-1 text-2xl text-[color:var(--ink)]">
                  {step}
                  {done && <span className="ml-2 text-[color:var(--accent)]">✓</span>}
                </div>
                <div className="mt-1 text-[13px] leading-relaxed text-[color:var(--stone)]">{line}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-14">
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Use of funds
          </div>
          <div className="mt-4 flex h-9 w-full overflow-hidden border border-[color:var(--stone)]/40 text-[12px] text-[#f6f2e9]">
            <div className="flex items-center justify-center" style={{ width: '50%', background: 'var(--ink)' }}>Product 50</div>
            <div className="flex items-center justify-center" style={{ width: '30%', background: '#3c4f60' }}>GTM 30</div>
            <div className="flex items-center justify-center" style={{ width: '15%', background: 'var(--accent)' }}>EMI 15</div>
            <div className="flex items-center justify-center" style={{ width: '5%', background: 'var(--stone)' }}>5</div>
          </div>
          <div className="mt-2 text-[11px] text-[color:var(--stone)]">
            Product 50 · Go-to-market 30 · Market-entry incl. EMI 15 · G&A 5 — the EMI is the
            margin-and-control step.
          </div>
          <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Next 6–12 months
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink)]/80">
            First paying portfolios in France and the Netherlands · escrow rail signed · the
            partner-bank channel from referral to revenue.
          </p>
        </Reveal>
        <Reveal order={3} className="self-center">
          <p className="deck-serif text-3xl leading-snug text-[color:var(--ink)]">
            A real product, a real plan —<br />
            <em className="text-[color:var(--accent)]">for the people who house Europe.</em>
          </p>
        </Reveal>
      </div>
    </div>
  )
}
