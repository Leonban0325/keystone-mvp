import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { CountUp } from '../components'
import { PARTNER_BANK } from '../../config'

/**
 * Phase 15 (Addendum I): the pitch deck as a landing-page section.
 * Kawasaki's ten slides, in the humane-PropTech register — warm ivory,
 * humanist serif, restrained line-art, reveal-not-perform motion. Every
 * number reconciles to the business-model documents. Keyboard / swipe /
 * chevrons advance; slides deep-link as /pitch#N; Present goes fullscreen.
 */

const SLIDE_COUNT = 10

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
            className="border border-[color:var(--stone)] px-2 py-0.5 uppercase transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
          >
            Present
          </button>
        </div>
        {/* Progress rail */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-black/5">
          <div
            className="h-full bg-[color:var(--brass)] transition-all duration-500"
            style={{ width: `${((index + 1) / SLIDE_COUNT) * 100}%` }}
          />
        </div>
        {/* Slide dots (clickable) */}
        <div className="absolute bottom-4 right-10 flex gap-1.5">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? 'bg-[color:var(--brass)]' : 'bg-black/15 hover:bg-black/30'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="px-10 pt-2 text-center text-[10px] uppercase tracking-[0.16em] text-greyx">
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

function Headline(props: { children: ReactNode; size?: string }) {
  return (
    <h2 className={`deck-serif mt-3 ${props.size ?? 'text-5xl'} font-medium leading-[1.08] text-[color:var(--ink)]`}>
      {props.children}
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

/** A quiet European streetscape in thin line-art — warmth without stock photos. */
function FacadeLine(props: { className?: string }) {
  return (
    <svg viewBox="0 0 640 90" className={props.className} aria-hidden fill="none" stroke="var(--stone)" strokeWidth="1">
      <path d="M0 88 H640" strokeWidth="1.2" />
      {/* Paris façade */}
      <path d="M20 88 V30 Q20 22 28 22 H92 Q100 22 100 30 V88" />
      <path d="M20 44 H100 M20 66 H100" strokeDasharray="1 5" />
      {[32, 52, 72].map((x) => (
        <g key={x}>
          <rect x={x} y={32} width={8} height={9} rx={1} />
          <rect x={x} y={50} width={8} height={11} rx={1} />
          <rect x={x} y={70} width={8} height={12} rx={1} />
        </g>
      ))}
      {/* Canal house */}
      <path d="M130 88 V34 L155 16 L180 34 V88" />
      <rect x={147} y={40} width={16} height={12} rx={1} />
      <rect x={147} y={60} width={16} height={14} rx={1} />
      <circle cx={155} cy={27} r={2.5} />
      {/* Door with arch */}
      <path d="M215 88 V54 A14 14 0 0 1 243 54 V88" />
      <circle cx={237} cy={72} r={1.6} fill="var(--brass)" stroke="none" />
      {/* Barcelona block */}
      <path d="M280 88 V26 H360 V88" />
      {[292, 316, 340].map((x) => (
        <g key={x}>
          <path d={`M${x} 36 h12 M${x} 34 v6 m12 -6 v6`} />
          <path d={`M${x} 56 h12 M${x} 54 v8 m12 -8 v8`} />
          <path d={`M${x} 74 h12`} />
        </g>
      ))}
      {/* Key */}
      <g transform="translate(420 52)">
        <circle cx={0} cy={0} r={9} />
        <circle cx={0} cy={0} r={3.5} />
        <path d="M9 0 H46 M36 0 V8 M42 0 V6" strokeWidth="1.4" />
      </g>
      {/* Lyon roofline */}
      <path d="M500 88 V40 L520 30 L540 40 V88 M540 44 H620 V88" />
      <rect x={552} y={52} width={12} height={10} rx={1} />
      <rect x={576} y={52} width={12} height={10} rx={1} />
      <rect x={600} y={52} width={12} height={10} rx={1} />
      <rect x={510} y={48} width={10} height={12} rx={1} />
    </svg>
  )
}

// ── 1 · Title ────────────────────────────────────────────────────────────────

function TitleSlide() {
  return (
    <div className="text-center">
      <Reveal order={0} className="flex justify-center">
        <ArchLarge size={84} />
      </Reveal>
      <Reveal order={1}>
        <h1 className="deck-serif mt-6 text-8xl font-medium tracking-tight text-[color:var(--ink)]">
          Keystone
        </h1>
      </Reveal>
      <Reveal order={2}>
        <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-[color:var(--stone)]">
          The financial operating system for European rental real estate.
        </p>
      </Reveal>
      <Reveal order={3}>
        <div className="mt-12 text-sm tracking-wide text-[color:var(--ink)]">
          Leon Ban · Duong Bui · Mark Gebrane · Bariah Al-besharah
        </div>
        <div className="mt-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--stone)]">
          HEC Startup Competition · 2026
        </div>
      </Reveal>
      <Reveal order={4}>
        <FacadeLine className="mx-auto mt-12 w-full max-w-2xl opacity-70" />
      </Reveal>
    </div>
  )
}

// ── 2 · Problem / Opportunity ────────────────────────────────────────────────

function ProblemSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>The problem</Kicker>
        <Headline>
          A landlord's money lives everywhere,
          <br />
          and works nowhere.
        </Headline>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-12">
        <Reveal order={1}>
          <p className="text-lg leading-relaxed text-[color:var(--ink)]/80">
            Rent lands in a personal account. Deposits sit frozen — earning nothing, held six
            different ways in six countries. At tax time, it all becomes a spreadsheet and a
            shoebox of receipts. For the people who house Europe, the finances of housing are
            still handmade.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['FR', 'NL', 'ES', 'DE', 'AT', 'IT'].map((c) => (
              <span key={c} className="border border-[color:var(--stone)]/50 px-2.5 py-1 text-xs tracking-[0.14em] text-[color:var(--stone)]">
                {c} · its own deposit law
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal order={2} className="border-l border-[color:var(--stone)]/40 pl-12">
          <div className="deck-serif text-7xl font-medium text-[color:var(--brass)]">&gt;€1 trillion</div>
          <div className="mt-2 text-sm uppercase tracking-[0.16em] text-[color:var(--stone)]">
            of rent flows through Europe every year
          </div>
          <div className="deck-serif mt-8 text-5xl font-medium text-[color:var(--ink)]">~25%</div>
          <div className="mt-2 text-sm uppercase tracking-[0.16em] text-[color:var(--stone)]">
            sits idle at any moment — deposits, reserves, float
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 3 · Value Proposition ────────────────────────────────────────────────────

function ValueSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>What Keystone is</Kicker>
        <Headline>
          One account. Legal by construction.
          <br />
          Cash that finally earns.
        </Headline>
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-12">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">Before</div>
          <ul className="mt-4 space-y-2.5 text-base text-[color:var(--ink)]/70">
            <li>A bank account that doesn't know what a lease is</li>
            <li>Deposits parked and frozen, six regimes by memory</li>
            <li>Rent chased by hand, arrears found too late</li>
            <li>A spreadsheet, an accountant, a deep breath</li>
          </ul>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--brass)]">With Keystone</div>
          <ul className="mt-4 space-y-2.5 text-base text-[color:var(--ink)]">
            <li>Every lease collects itself — rent, dunning, receipts</li>
            <li>Deposits segregated, protected, statutory by default</li>
            <li>Idle cash earns at the policy rate — owners keep 60%</li>
            <li>Books that fold to the cent, ready for the accountant</li>
          </ul>
        </Reveal>
      </div>
      <Reveal order={3}>
        <p className="mt-12 border-t border-[color:var(--stone)]/40 pt-4 text-lg italic text-[color:var(--stone)]">
          The relief of simplicity — one calm account for the financial life of a portfolio.
        </p>
      </Reveal>
    </div>
  )
}

// ── 4 · Underlying Magic ─────────────────────────────────────────────────────

function MagicSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>How it works</Kicker>
        <Headline>The compliance engine, on rented rails.</Headline>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-12 grid grid-cols-[1fr_1fr_1fr_20px_220px] items-stretch gap-0">
          {[
            ['Compliance engine', 'Six statutory regimes as versioned rules — caps, clocks, lodgement, interest. Ours.'],
            ['Escrow rail', 'A regulated EMI/escrow layer moves every euro. Rented, not built.'],
            [`${PARTNER_BANK.short} vault`, 'Client funds sit segregated and DGS-protected at a partner bank. Insolvency-remote.'],
          ].map(([title, line], i) => (
            <div key={title} className={`border border-[color:var(--stone)]/50 p-5 ${i > 0 ? 'border-l-0' : ''}`}>
              <div className="deck-serif text-xl text-[color:var(--ink)]">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
          <div className="flex items-center justify-center text-[color:var(--stone)]">⤳</div>
          <div className="border border-dashed border-[color:var(--brass)] p-5">
            <div className="deck-serif text-xl text-[color:var(--brass)]">Keystone</div>
            <div className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]/80">
              Orchestrates every step, beside the flow. The money never touches our balance sheet.
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal order={2}>
        <p className="mt-10 text-lg text-[color:var(--stone)]">
          Deterministic core — <span className="text-[color:var(--ink)]">rules decide, AI reads</span>.
          Nothing with legal or financial consequence is left to a model.
        </p>
      </Reveal>
    </div>
  )
}

// ── 5 · Business Model ───────────────────────────────────────────────────────

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
        <div className="deck-serif mt-3 text-8xl font-medium text-[color:var(--brass)]">
          {props.active ? <CountUp value={225} format={(v) => `€${Math.round(v)}`} /> : '€225'}
          <span className="text-4xl text-[color:var(--stone)]"> / unit / year</span>
        </div>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-12">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Seven revenue lines
          </div>
          <ul className="mt-3 columns-1 space-y-1.5 text-base text-[color:var(--ink)]/85">
            {REVENUE_LINES.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
          <div className="mt-5 text-sm text-[color:var(--stone)]">
            ~two-thirds of revenue is rate-independent.
          </div>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Every €100 of yield on idle balances
          </div>
          <div className="mt-4 flex h-12 w-full overflow-hidden border border-[color:var(--stone)]/40">
            <div className="flex items-center justify-center bg-[color:var(--ink)] text-sm text-[#F6F2E9]" style={{ width: '60%' }}>
              Owner €60
            </div>
            <div className="flex items-center justify-center bg-[color:var(--brass)] text-sm text-[#F6F2E9]" style={{ width: '27%' }}>
              Keystone €27
            </div>
            <div className="flex items-center justify-center bg-[color:var(--stone)] text-sm text-[#F6F2E9]" style={{ width: '13%' }}>
              Bank €13
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[color:var(--stone)]">
            The owner keeps the majority of every basis point — the yield pays for the software,
            and the account gets stickier as rates move.
          </p>
        </Reveal>
      </div>
    </div>
  )
}

// ── 6 · Go-to-Market ─────────────────────────────────────────────────────────

function GtmSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Go-to-market</Kicker>
        <Headline>Clean-yield markets first.</Headline>
      </Reveal>
      <Reveal order={1}>
        <div className="mt-10 grid grid-cols-3 gap-0">
          {[
            ['Now', 'FR · NL · ES', 'Deposit float is investable; compliance pain is acute.'],
            ['Next', 'PL · PT', 'High rental growth, fragmented tooling.'],
            ['Then', 'DE · AT · IT', 'Engine already speaks §551 BGB — enter with rails ready.'],
          ].map(([when, markets, line], i) => (
            <div key={when} className={`border border-[color:var(--stone)]/50 p-6 ${i > 0 ? 'border-l-0' : ''}`}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--brass)]">{when}</div>
              <div className="deck-serif mt-1 text-3xl text-[color:var(--ink)]">{markets}</div>
              <div className="mt-2 text-sm leading-relaxed text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal order={2}>
        <div className="mt-10 grid grid-cols-4 gap-6 text-sm">
          {[
            ['Letting agents', 'the trusted local channel'],
            ['Property managers', '850 units per contract'],
            ['Software platforms', 'embedded as the financial layer'],
            ['Partner-bank channel', 'the bank refers its landlords'],
          ].map(([channel, line]) => (
            <div key={channel} className="border-t border-[color:var(--stone)]/40 pt-3">
              <div className="font-medium text-[color:var(--ink)]">{channel}</div>
              <div className="mt-1 text-[color:var(--stone)]">{line}</div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg text-[color:var(--stone)]">
          One partnership → <span className="text-[color:var(--ink)]">thousands of units</span>.
          Distribution over door-knocking.
        </p>
      </Reveal>
    </div>
  )
}

// ── 7 · Competition ──────────────────────────────────────────────────────────

function CompetitionSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Competition</Kicker>
        <Headline>Alone in the quadrant.</Headline>
      </Reveal>
      <div className="mt-8 grid grid-cols-[1fr_300px] gap-10">
        <Reveal order={1}>
          <svg viewBox="0 0 520 340" className="w-full">
            <line x1="60" y1="20" x2="60" y2="300" stroke="var(--stone)" strokeWidth="1" />
            <line x1="60" y1="300" x2="500" y2="300" stroke="var(--stone)" strokeWidth="1" />
            <line x1="280" y1="20" x2="280" y2="300" stroke="var(--stone)" strokeWidth="0.5" strokeDasharray="3 5" />
            <line x1="60" y1="160" x2="500" y2="160" stroke="var(--stone)" strokeWidth="0.5" strokeDasharray="3 5" />
            <text x="500" y="318" textAnchor="end" fontSize="11" fill="var(--stone)">multi-country compliance →</text>
            <text x="64" y="318" fontSize="11" fill="var(--stone)">single-country</text>
            <text x="48" y="26" fontSize="11" fill="var(--stone)" transform="rotate(-90 48 26)" textAnchor="end">moves & grows money →</text>
            <text x="48" y="300" fontSize="11" fill="var(--stone)" transform="rotate(-90 48 300)">software only</text>
            {[
              [120, 262, 'PMS software'],
              [105, 200, 'Rent-collection fintechs'],
              [150, 232, 'National deposit schemes'],
              [200, 120, 'Neobanks for landlords'],
              [175, 80, 'Goldbridge (US)'],
            ].map(([x, y, label]) => (
              <g key={String(label)}>
                <circle cx={Number(x)} cy={Number(y)} r="4" fill="var(--stone)" />
                <text x={Number(x) + 9} y={Number(y) + 4} fontSize="12" fill="var(--ink)" opacity="0.75">{label}</text>
              </g>
            ))}
            <g>
              <circle cx="430" cy="55" r="7" fill="var(--brass)" />
              <text x="430" y="36" textAnchor="middle" fontSize="15" fill="var(--ink)" fontWeight="600">Keystone</text>
            </g>
          </svg>
        </Reveal>
        <Reveal order={2} className="self-center text-sm leading-relaxed">
          <ul className="space-y-3 text-[color:var(--ink)]/80">
            <li><span className="font-medium text-[color:var(--ink)]">PMS software</span> — manages the property, never the money.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Rent-collection fintechs</span> — one country, one rail, no compliance engine.</li>
            <li><span className="font-medium text-[color:var(--ink)]">National deposit schemes</span> — custody without yield, one regime each.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Neobanks for landlords</span> — an account, not an operating system.</li>
            <li><span className="font-medium text-[color:var(--ink)]">Goldbridge (US)</span> — validates the model; no European engine.</li>
          </ul>
        </Reveal>
      </div>
    </div>
  )
}

// ── 8 · Team ─────────────────────────────────────────────────────────────────

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
        <Headline>Four founders, one conviction.</Headline>
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-x-14 gap-y-10">
        {FOUNDERS.map(([name, line], i) => (
          <Reveal key={name} order={i + 1}>
            <div className="border-t border-[color:var(--stone)]/40 pt-4">
              <div className="deck-serif text-3xl text-[color:var(--ink)]">{name}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-[color:var(--stone)]">{line}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal order={5}>
        <p className="mt-12 text-lg italic text-[color:var(--stone)]">
          Housing is where Europeans keep their money and their lives — it deserves financial
          infrastructure built with the same care.
        </p>
      </Reveal>
    </div>
  )
}

// ── 9 · Financials ───────────────────────────────────────────────────────────

const MILESTONES: [string, string, number, string][] = [
  // label, revenue, bar height %, margin note
  ['Seed', '€4.5M', 8, 'breakeven'],
  ['Series A', '€21.4M', 26, '24% EBITDA'],
  ['Scale', '€239M', 100, '48% EBITDA'],
]

const PER_UNIT: [string, number][] = [
  ['Small landlord', 177],
  ['Mid landlord', 249],
  ['Property manager', 203],
  ['Housing assoc.', 124],
  ['Institutional BTR', 264],
]

function FinancialsSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Financials</Kicker>
        <Headline>Software margins on fintech revenue.</Headline>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-14">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Revenue & margin at steady state
          </div>
          <div className="mt-6 flex h-48 items-end gap-10">
            {MILESTONES.map(([label, revenue, height, margin]) => (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div className="deck-serif text-xl text-[color:var(--ink)]">{revenue}</div>
                <div
                  className="mt-2 w-full bg-[color:var(--brass)]"
                  style={{ height: `${Math.max(4, height * 1.4)}px`, opacity: 0.45 + height / 180 }}
                />
                <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[color:var(--stone)]">{label}</div>
                <div className="text-xs text-[color:var(--ink)]/70">{margin}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-[color:var(--stone)]">
            Steady state at each milestone · ECB deposit facility 2.25% · growth carried by units
            under management and per-unit adoption, not price.
          </div>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Revenue per unit per year, by client type
          </div>
          <div className="mt-6 space-y-3">
            {PER_UNIT.map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-[color:var(--ink)]/80">{label}</span>
                <div className="h-4 bg-[color:var(--ink)]" style={{ width: `${(value / 264) * 55}%`, opacity: 0.8 }} />
                <span className="tabular-nums text-[color:var(--ink)]">€{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 text-xs text-[color:var(--stone)]">
            Blended €225 across the mix — every figure folds from the same model the product
            reconciles against.
          </div>
        </Reveal>
      </div>
    </div>
  )
}

// ── 10 · Status & Ask ────────────────────────────────────────────────────────

function AskSlide() {
  return (
    <div>
      <Reveal order={0}>
        <Kicker>Where we are</Kicker>
        <Headline>Built. Climbing the licence ladder.</Headline>
      </Reveal>
      <div className="mt-10 grid grid-cols-2 gap-14">
        <Reveal order={1}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--brass)]">Done</div>
          <ul className="mt-3 space-y-2 text-base text-[color:var(--ink)]/85">
            <li>✓ Working prototype — six-regime compliance engine, double-entry ledger</li>
            <li>✓ Every client segment live, from 3 units to 850</li>
            <li>✓ On partner rails as PSD2 agent — money never on our balance sheet</li>
          </ul>
          <div className="mt-7 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            The ladder
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--ink)]/85">
            <span className="border border-[color:var(--brass)] px-2 py-1">PSD2 agent · now</span>
            <span className="text-[color:var(--stone)]">→</span>
            <span className="border border-[color:var(--stone)]/50 px-2 py-1">EMI · Series A</span>
            <span className="text-[color:var(--stone)]">→</span>
            <span className="border border-[color:var(--stone)]/50 px-2 py-1">Banking licence · scale</span>
          </div>
          <div className="mt-7 text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Next 6–12 months
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]/80">
            First paying portfolios in France and the Netherlands · escrow rail signed · the
            partner-bank channel from referral to revenue.
          </p>
        </Reveal>
        <Reveal order={2}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--stone)]">
            Use of funds
          </div>
          <div className="mt-4 space-y-3">
            {[
              ['Product', 50],
              ['Go-to-market', 30],
              ['Market entry incl. EMI', 15],
              ['G&A', 5],
            ].map(([label, pct]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-[color:var(--ink)]/80">{label}</span>
                <div className="h-4 bg-[color:var(--brass)]" style={{ width: `${Number(pct) * 1.6}%`, opacity: 0.85 }} />
                <span className="tabular-nums text-[color:var(--ink)]">{pct}%</span>
              </div>
            ))}
          </div>
          <p className="deck-serif mt-12 text-3xl leading-snug text-[color:var(--ink)]">
            A real product, a real plan —<br />
            <span className="text-[color:var(--brass)]">for the people who house Europe.</span>
          </p>
        </Reveal>
      </div>
    </div>
  )
}
