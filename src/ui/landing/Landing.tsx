import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { Route, useApp } from '../store'
import { AboutPrototypeDialog, Button } from '../components'
import { PARTNER_BANK } from '../../config'

/**
 * The public face (Addendum F §1, design language per the editorial
 * warm-institutional direction): display-serif roman/italic headlines,
 * wide-caps kickers, warm ivory base, hairline structure, one dark
 * full-bleed section, muted green for live/positive states. Every figure
 * matches the stored data and the business-model documents. Nothing claims
 * a live service; partner rails are named by category.
 */

const NAV: { route: Route; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'firm', label: 'The Firm' },
  { route: 'services', label: 'Services' },
  { route: 'insight', label: 'Insight' },
  { route: 'pitch', label: 'Pitch' },
  { route: 'access', label: 'Client Access' },
  { route: 'contact', label: 'Contact' },
]

export default function Landing(props: { section: Route; children?: React.ReactNode }) {
  const { navigate } = useApp()
  const [aboutOpen, setAboutOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header className="border-b rule">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <button className="flex items-baseline gap-2 text-left" onClick={() => navigate('home')}>
            <ArchMark />
            <span className="serif-display text-xl font-medium tracking-tight">Keystone</span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-greyx sm:inline">
              Financial infrastructure for rental real estate
            </span>
          </button>
          <nav className="flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`${
                  props.section === item.route
                    ? 'border-b-2 border-brass font-medium text-ink'
                    : 'text-greyx hover:text-ink'
                } ${item.route === 'access' ? 'border border-ink px-3 py-1 !text-ink hover:bg-ink hover:!text-paper' : 'pb-1'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        {props.children ?? <SectionBody section={props.section} />}
      </main>

      <footer className="border-t rule">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-[11px] text-greyx">
          <span>© 2026 Keystone Financial Technologies · Paris — Amsterdam</span>
          <button
            className="underline-offset-2 hover:text-ink hover:underline"
            onClick={() => setAboutOpen(true)}
          >
            About this prototype
          </button>
        </div>
      </footer>
      {aboutOpen && <AboutPrototypeDialog onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

function SectionBody(props: { section: Route }) {
  switch (props.section) {
    case 'firm':
      return <Firm />
    case 'services':
      return <Services />
    case 'insight':
      return <Insight />
    case 'contact':
      return <Contact />
    default:
      return <Home />
  }
}

// ── shared editorial furniture ───────────────────────────────────────────────

/** A restrained keystone-arch motif — five voussoirs, brass key. */
function ArchMark(props: { size?: number }) {
  const s = props.size ?? 22
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden className="translate-y-[2px]">
      <g stroke="var(--ink)" strokeWidth="1.4" fill="none">
        <path d="M3 20 V13 A9 9 0 0 1 21 13 V20" />
        <path d="M6.2 20 V13.4 A5.8 5.8 0 0 1 17.8 13.4 V20" />
      </g>
      <path d="M10 4.4 L14 4.4 L13.2 9.4 L10.8 9.4 Z" fill="var(--brass)" />
    </svg>
  )
}

/** Wide-tracked all-caps kicker — the section label "furniture". */
function Kicker(props: { children: ReactNode; light?: boolean }) {
  return (
    <div
      className={`text-[11px] uppercase tracking-[0.24em] ${
        props.light ? 'text-[#97a1ab]' : 'text-greyx'
      }`}
    >
      {props.children}
    </div>
  )
}

/** The house headline: first line roman, second line italic, each with a period. */
function HeadlinePair(props: { roman: string; italic: string; size?: string; light?: boolean }) {
  return (
    <h1
      className={`serif-display mt-3 ${props.size ?? 'text-5xl'} font-medium leading-[1.12] ${
        props.light ? 'text-[#f3eee3]' : 'text-ink'
      }`}
    >
      {props.roman}
      <br />
      <em>{props.italic}</em>
    </h1>
  )
}

/** Scroll-reveal: slow fade + small upward drift, once per element. */
function Reveal(props: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`${shown ? 'reveal-in' : 'reveal-idle'} ${props.className ?? ''}`}>
      {props.children}
    </div>
  )
}

/** A quiet European streetscape in thin line-art — warmth without stock photos. */
function FacadeLine(props: { className?: string }) {
  return (
    <svg viewBox="0 0 640 90" className={props.className} aria-hidden fill="none" stroke="var(--grey)" strokeWidth="1">
      <path d="M0 88 H640" strokeWidth="1.2" />
      <path d="M20 88 V30 Q20 22 28 22 H92 Q100 22 100 30 V88" />
      <path d="M20 44 H100 M20 66 H100" strokeDasharray="1 5" />
      {[32, 52, 72].map((x) => (
        <g key={x}>
          <rect x={x} y={32} width={8} height={9} rx={1} />
          <rect x={x} y={50} width={8} height={11} rx={1} />
          <rect x={x} y={70} width={8} height={12} rx={1} />
        </g>
      ))}
      <path d="M130 88 V34 L155 16 L180 34 V88" />
      <rect x={147} y={40} width={16} height={12} rx={1} />
      <rect x={147} y={60} width={16} height={14} rx={1} />
      <circle cx={155} cy={27} r={2.5} />
      <path d="M215 88 V54 A14 14 0 0 1 243 54 V88" />
      <circle cx={237} cy={72} r={1.6} fill="var(--brass)" stroke="none" />
      <path d="M280 88 V26 H360 V88" />
      {[292, 316, 340].map((x) => (
        <g key={x}>
          <path d={`M${x} 36 h12 M${x} 34 v6 m12 -6 v6`} />
          <path d={`M${x} 56 h12 M${x} 54 v8 m12 -8 v8`} />
          <path d={`M${x} 74 h12`} />
        </g>
      ))}
      <g transform="translate(420 52)">
        <circle cx={0} cy={0} r={9} />
        <circle cx={0} cy={0} r={3.5} />
        <path d="M9 0 H46 M36 0 V8 M42 0 V6" strokeWidth="1.4" />
      </g>
      <path d="M500 88 V40 L520 30 L540 40 V88 M540 44 H620 V88" />
      <rect x={552} y={52} width={12} height={10} rx={1} />
      <rect x={576} y={52} width={12} height={10} rx={1} />
      <rect x={600} y={52} width={12} height={10} rx={1} />
      <rect x={510} y={48} width={10} height={12} rx={1} />
    </svg>
  )
}

/**
 * The live ledger card — a real portfolio over the real waterfall figures
 * (Meridian Properties SCI: €125,000 = €22,202 deposits + €102,798 reserves;
 * July rent €1,809.00 → €12.00 SaaS fee → €62.90 vendor netting → €1,734.10
 * to owner — the same waterfall the product reconciles).
 */
function LiveLedgerCard() {
  const rows: [string, string, string, string, boolean][] = [
    // time, description, sub-label, signed amount, positive?
    ['09:12', 'Rent settled', 'Rue Oberkampf 14, Paris 11e · SEPA SDD', '+€1,809.00', true],
    ['09:12', 'Software fee', 'July · per unit', '−€12.00', false],
    ['09:14', 'Vendor netting', 'card-routed spend, pre-coded', '−€62.90', false],
    ['09:17', 'Owner payout', 'after reserve floor · waterfall', '−€1,734.10', false],
  ]
  return (
    <div className="border rule bg-white/50">
      <div className="flex items-baseline justify-between border-b rule px-4 py-3">
        <span className="text-sm font-medium">Meridian Properties SCI</span>
        <span className="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.1em] text-greyx">
          EUR
          <span className="flex items-center gap-1 text-[color:var(--green)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--green)]" />
            Live
          </span>
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x rule border-b rule text-center">
        {[
          ['€125,000', 'under management'],
          ['€22,202', 'deposits'],
          ['€102,798', 'reserves'],
        ].map(([value, label]) => (
          <div key={label} className="px-2 py-3">
            <div className="text-base font-semibold tabular-nums">{value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-greyx">{label}</div>
          </div>
        ))}
      </div>
      <div className="divide-y rule px-4">
        {rows.map(([time, desc, sub, amount, positive]) => (
          <div key={desc} className="flex items-baseline gap-3 py-2 text-sm">
            <span className="font-mono text-[11px] text-greyx">{time}</span>
            <span className="min-w-0 flex-1">
              <span className="text-ink">{desc}</span>
              <span className="ml-2 hidden text-xs text-greyx lg:inline">{sub}</span>
            </span>
            <span
              className={`tabular-nums ${positive ? 'font-medium text-[color:var(--green)]' : 'text-ink'}`}
            >
              {amount}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t rule px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-greyx">
        Event-sourced ledger · deterministic replay
      </div>
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────

const PILLARS: [string, string][] = [
  ['Rent rails', 'Per-lease virtual IBANs, SEPA collection, R-transaction dunning as a state machine — every lease collects itself.'],
  ['Deposit custody', 'Segregated, DGS-protected, statutory by construction — caps, clocks and lodgement duties encoded as versioned rules.'],
  ['Treasury & yield', 'Idle deposits and reserves earn at the policy rate. Owners keep ~60% of every basis point.'],
  ['Card & spend', 'Property cards with per-property routing and category locks; every swipe lands pre-coded on the ledger.'],
  ['Savings engine', 'Five always-on detectors — property tax, utilities, vendors, insurance, subsidies. Success-fee only.'],
  ['Books & reporting', 'Quittances, FEC-style exports, lender packs — folded from the journal, auditable to the cent.'],
]

const REGIMES: { code: string; name: string; live: boolean; rule: string }[] = [
  { code: 'FR', name: 'France', live: true, rule: 'Cap 1 month unfurnished · return 1–2 months · 10%/month late penalty' },
  { code: 'NL', name: 'Netherlands', live: true, rule: 'Cap 2 months · 14-day return clock · no tenant interest' },
  { code: 'ES', name: 'España', live: true, rule: '1-month fianza · mandatory regional lodgement' },
  { code: 'DE', name: 'Deutschland', live: false, rule: '3× Kaltmiete cap · insolvency-proof segregation · tenant interest' },
  { code: 'AT', name: 'Österreich', live: false, rule: 'Separate secure holding · tenant interest' },
  { code: 'IT', name: 'Italia', live: false, rule: 'Cap 3 months · statutory legal-rate interest annually' },
]

const LEASE_TIMELINE: [string, string, string][] = [
  ['T+0', 'Lease signed', 'AI reads the document; rules encode the regime — cap, clock, lodgement duty.'],
  ['T+1', 'Virtual IBAN issued', 'A per-lease collection account; the deposit lands segregated at the partner bank.'],
  ['M+1', 'Rent cleared', 'SEPA collection settles; the books post themselves, double-entry, dimensioned.'],
  ['M+6', 'Yield accrued', 'Idle balances earn at the policy rate — the owner keeps ~60% of every basis point.'],
  ['EXIT', 'Deposit returned', 'The statutory return clock runs; the ledger closes the lease to the cent.'],
]

function Home() {
  const { navigate } = useApp()
  return (
    <div>
      {/* Hero: editorial headline beside the live ledger card. */}
      <section className="grid grid-cols-[1fr_420px] items-center gap-16 border-b rule py-16">
        <div>
          <Kicker>The financial operating system for European rental real estate</Kicker>
          <HeadlinePair roman="One account." italic="Legal by construction." size="text-6xl" />
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-greyx">
            Rent rails, statutory deposit custody, treasury yield and books — six regimes on one
            event-sourced ledger, every euro accounted to the cent.
          </p>
          <div className="mt-8 flex gap-3">
            <Button tone="primary" onClick={() => navigate('access')}>
              Client Access
            </Button>
            <Button tone="quiet" onClick={() => navigate('contact')}>
              Talk to the desk
            </Button>
          </div>
        </div>
        <Reveal>
          <LiveLedgerCard />
        </Reveal>
      </section>

      {/* Proof strip — category-truthful, no real logos. */}
      <section className="grid grid-cols-4 divide-x rule border-b rule text-center">
        {[
          ['FR · NL · ES', 'markets live'],
          ['DE · AT · IT', 'engine-ready'],
          ['6 statutory regimes', 'one engine'],
          ['BaFin-regulated banking + escrow rails', 'built on'],
        ].map(([value, label]) => (
          <div key={label} className="px-4 py-6">
            <div className="serif-display text-base font-medium">{value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-greyx">{label}</div>
          </div>
        ))}
      </section>

      {/* Six pillars. One account. */}
      <section className="border-b rule py-16">
        <Reveal>
          <Kicker>What it replaces</Kicker>
          <h2 className="serif-display mt-3 text-4xl font-medium leading-tight">
            Six pillars. <em>One account.</em>
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-3 gap-x-12 gap-y-10">
          {PILLARS.map(([title, line]) => (
            <Reveal key={title}>
              <div className="border-t rule pt-4">
                <h3 className="serif-display text-xl font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-greyx">{line}</p>
                <button
                  className="mt-3 text-xs text-brass underline-offset-2 hover:underline"
                  onClick={() => navigate('services')}
                >
                  Explore →
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Regime cards — the fragmentation IS the argument. */}
      <section className="border-b rule py-16">
        <Reveal>
          <Kicker>Six regimes · one engine</Kicker>
          <h2 className="serif-display mt-3 text-4xl font-medium leading-tight">
            Every market holds deposits <em>its own way.</em>
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-3 gap-4">
          {REGIMES.map((regime) => (
            <Reveal key={regime.code}>
              <div className="flex h-full flex-col border rule bg-white/40 p-4">
                <div className="flex items-start justify-between">
                  <span className="serif-display text-5xl font-medium leading-none">
                    {regime.code}
                  </span>
                  <span
                    className={`border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${
                      regime.live
                        ? 'border-[color:var(--green)] text-[color:var(--green)]'
                        : 'border-hairline text-greyx'
                    }`}
                  >
                    {regime.live ? 'Live' : 'Engine-ready'}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium">{regime.name}</div>
                <div className="mt-1 text-xs leading-relaxed text-greyx">{regime.rule}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 text-xs text-greyx">
          Statutory parameters as encoded in the compliance engine — versioned rules with legal
          references, tested like software.
        </div>
      </section>

      {/* Event-chain timeline — how a lease flows. */}
      <section className="border-b rule py-16">
        <div className="grid grid-cols-[1fr_1.2fr] gap-16">
          <Reveal>
            <Kicker>Engineering principle</Kicker>
            <HeadlinePair roman="Deterministic core." italic="Probabilistic edges." size="text-4xl" />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-greyx">
              Everything with financial or legal consequence — the ledger, the compliance rules,
              the yield split — is deterministic, versioned and testable. AI works only at the
              language boundary: it reads documents and answers questions. It never decides where
              money goes.
            </p>
            <FacadeLine className="mt-10 w-full max-w-md opacity-50" />
          </Reveal>
          <Reveal>
            <div className="text-[10px] uppercase tracking-[0.1em] text-greyx">
              How a lease flows
            </div>
            <div className="mt-4">
              {LEASE_TIMELINE.map(([tick, title, line], i) => (
                <div key={tick} className="relative flex gap-5 pb-7 last:pb-0">
                  {i < LEASE_TIMELINE.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-[color:var(--hairline)]" />
                  )}
                  <span className="relative mt-1.5 inline-block h-[11px] w-[11px] shrink-0 rounded-full border border-ink bg-paper" />
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-greyx">
                      {tick}
                    </span>
                    <div className="text-base font-semibold leading-snug">{title}</div>
                    <div className="mt-1 max-w-md text-sm leading-relaxed text-greyx">{line}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* The ONE dark section — regulatory posture. */}
      <section
        className="bg-[#14202b] text-[#f3eee3]"
        style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-[1.1fr_1fr] gap-16">
            <Reveal>
              <Kicker light>Regulatory posture</Kicker>
              <HeadlinePair roman="Licence-light." italic="Deliberately." size="text-5xl" light />
              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#97a1ab]">
                Client money moves over partner rails — a regulated EMI/escrow layer and
                segregated, DGS-protected accounts at a BaFin-regulated partner bank — with
                Keystone as orchestrator and agent. The money never touches our balance sheet.
                That is both the safety story and the capital-light business model.
              </p>
            </Reveal>
            <Reveal className="self-center">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#97a1ab]">
                The licence ladder
              </div>
              <div className="mt-4 space-y-0">
                {[
                  ['Now', 'PSD2 agent', 'orchestration on rented rails — live in the prototype', true],
                  ['Series A', 'Own the EMI', 'the payment layer in-house — margin and control', false],
                  ['At scale', 'Banking licence', 'when retained margin beats the cost of capital', false],
                ].map(([when, step, line, done]) => (
                  <div
                    key={String(step)}
                    className="flex items-baseline gap-4 border-t border-[#2a3a49] py-4 last:border-b last:border-[#2a3a49]"
                  >
                    <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.1em] text-[#97a1ab]">
                      {when}
                    </span>
                    <div className="flex-1">
                      <div className="serif-display text-xl font-medium">
                        {step}
                        {done && <span className="ml-2 text-[color:#86ac90]">✓</span>}
                      </div>
                      <div className="mt-1 text-xs text-[#97a1ab]">{line}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Closing invitation. */}
      <section className="py-16">
        <Reveal className="flex items-end justify-between gap-8">
          <div>
            <Kicker>See it over the ledger</Kicker>
            <h2 className="serif-display mt-3 text-3xl font-medium leading-tight">
              Sign in as any client segment — <em>the books are open.</em>
            </h2>
          </div>
          <Button tone="primary" onClick={() => navigate('access')}>
            Client Access
          </Button>
        </Reveal>
      </section>
    </div>
  )
}

// ── The Firm ─────────────────────────────────────────────────────────────────

const FOUNDERS = [
  ['Leon Ban', 'Co-founder'],
  ['Duong Bui', 'Co-founder'],
  ['Mark Gebrane', 'Co-founder'],
  ['Badriah Al-Besharah', 'Co-founder'],
]

function Firm() {
  return (
    <div className="max-w-3xl py-16">
      <Kicker>The firm</Kicker>
      <HeadlinePair roman="Deterministic core." italic="Probabilistic edges." size="text-4xl" />
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-greyx">
        <p>
          European rental real estate runs on fragmented, manual financial plumbing: deposits held
          against six different statutory regimes, rent collected over rails built for something
          else, idle cash earning nothing, and compliance handled by memory. Keystone replaces
          that plumbing with one account — collections, custody, treasury and reporting on a
          single event-sourced ledger.
        </p>
        <p>
          Our engineering principle is <span className="text-ink">deterministic core,
          probabilistic edges</span>: everything with financial or legal consequence — the
          ledger, the compliance rules, the yield split — is deterministic, versioned and
          testable. AI works only at the language boundary, reading documents and answering
          questions; it never decides where money goes.
        </p>
        <p>
          Our regulatory posture is deliberately licence-light: client money moves over
          partner rails — a regulated EMI/escrow layer and segregated accounts at a
          BaFin-regulated partner bank — with Keystone as orchestrator and agent. The money
          never touches our balance sheet; that is both the safety story and the capital-light
          business model.
        </p>
      </div>

      <h2 className="mt-12 text-[11px] uppercase tracking-[0.24em] text-greyx">Founders</h2>
      <div className="mt-4 grid grid-cols-4 gap-4">
        {FOUNDERS.map(([name, role]) => (
          <div key={name} className="border-t rule pt-3">
            <div className="serif-display text-lg font-medium">{name}</div>
            <div className="mt-1 text-xs text-greyx">{role}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 border-t rule pt-4 text-sm text-greyx">
        Target launch partners: tier-one BaFin-regulated institutions —{' '}
        <span className="text-ink">{PARTNER_BANK.name}</span> class.
      </div>
    </div>
  )
}

// ── Services ─────────────────────────────────────────────────────────────────

const SERVICE_GROUPS: [string, string[]][] = [
  ['Banking & rent rails', ['Per-lease virtual IBANs, SEPA direct-debit collection, R-transaction dunning', 'Owner payout waterfalls with reserve floors and vendor netting']],
  ['Deposit custody & statutory compliance', ['Segregated, DGS-protected deposit custody across FR · NL · ES (DE · AT · IT engine-ready)', 'Six-regime rules-as-code: caps, return clocks, lodgement, tenant interest — with one-click remediation']],
  ['Treasury & yield', ['Idle deposits and reserves earn at the policy rate; owners keep ~60% of every basis point', 'Flat-fee failsafe when rates fall — the floor holds']],
  ['Card, spend & books', ['Property cards with per-property routing and category locks, every swipe pre-coded', 'FEC-style exports and quittances the accountant accepts as-is']],
  ['Savings & optimisation', ['Five always-on detectors: property tax, utilities, vendors, insurance, subsidies — success-fee only', 'NOI bridge and asset-value impact on every executed opportunity']],
  ['Analytics', ['Portfolio → owner → property → lease roll-ups over the dimensioned ledger', 'Covenant monitoring, refinancing readiness and benchmarking for institutional stock']],
]

function Services() {
  return (
    <div className="py-16">
      <Kicker>Services</Kicker>
      <HeadlinePair roman="One account." italic="Priced per unit." size="text-4xl" />
      <p className="mt-5 max-w-2xl text-sm text-greyx">
        The financial life of a rental portfolio — from solo landlords to listed BTR.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-x-12 gap-y-8">
        {SERVICE_GROUPS.map(([group, lines]) => (
          <div key={group} className="border-t rule pt-4">
            <h3 className="serif-display text-lg font-medium">{group}</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-greyx">
              {lines.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 border-t rule pt-4 text-sm text-greyx">
        <span className="font-semibold text-ink">Who we serve.</span> Small and mid-size
        landlords on self-serve tiers · enterprise — property managers, housing associations and
        institutional BTR — under white-label and procurement-grade terms · software platforms
        and banks through partnership distribution.
      </div>
    </div>
  )
}

// ── Insight ──────────────────────────────────────────────────────────────────

const ARTICLES = [
  ['The idle billions in Europe’s rental deposits', 'Tenant deposits across FR·NL·ES·DE sit largely unremunerated in commingled accounts. What segregation plus the deposit facility rate does to that picture — and who should keep the yield.'],
  ['Six regimes, one obligation', 'Deposit caps, return clocks and lodgement duties differ across every major European market. Why compliance-as-code beats compliance-as-checklist for anyone operating across borders.'],
  ['Europe’s 2026–28 refinancing wall', 'A large share of institutional rental debt reprices within 36 months. Covenant-ready books — DSCR, LTV, occupancy, EPC — will decide who refinances on terms.'],
  ['R-transactions are a data problem', 'Most failed rent collections recover within one cycle. The operators who know which ones won’t are running dunning as a state machine, not a spreadsheet.'],
]

function Insight() {
  return (
    <div className="py-16">
      <Kicker>Research notes</Kicker>
      <HeadlinePair roman="From the desk." italic="On deposit capital." size="text-4xl" />
      <div className="mt-10 grid grid-cols-2 gap-x-12 gap-y-10">
        {ARTICLES.map(([title, summary]) => (
          <article key={title} className="border-t rule pt-4">
            <h3 className="serif-display text-xl font-medium leading-snug">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-greyx">{summary}</p>
            <div className="mt-3 text-[10px] uppercase tracking-[0.1em] text-brass">
              Full note — coming soon
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ── Contact ──────────────────────────────────────────────────────────────────

function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    // Prototype posture: the form logs — no CRM claims a live service.
    console.info('[keystone] contact request', data)
    setSent(true)
  }
  return (
    <div className="grid max-w-4xl grid-cols-2 gap-12 py-16">
      <div>
        <Kicker>Contact</Kicker>
        <HeadlinePair roman="Write to the desk." italic="Directly." size="text-4xl" />
        <p className="mt-5 text-sm leading-relaxed text-greyx">
          For enterprise demonstrations — property managers, housing associations, institutional
          portfolios and platform partnerships.
        </p>
        <div className="mt-8 space-y-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-greyx">Head office</div>
            <div className="mt-1">10 rue de Penthièvre, 75008 Paris</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-greyx">Enterprise</div>
            <div className="mt-1">enterprise@keystone.eu</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-greyx">Partnerships</div>
            <div className="mt-1">partners@keystone.eu</div>
          </div>
        </div>
      </div>
      <div>
        {sent ? (
          <div className="border rule bg-white/40 p-6 text-sm">
            <div className="font-semibold">Request received.</div>
            <div className="mt-1 text-greyx">
              The desk will come back to you within one business day.
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {[
              ['name', 'Name', 'text'],
              ['organisation', 'Organisation', 'text'],
              ['email', 'Work email', 'email'],
            ].map(([name, label, type]) => (
              <label key={name} className="block text-sm">
                <span className="text-[10px] uppercase tracking-[0.1em] text-greyx">{label}</span>
                <input
                  name={name}
                  type={type}
                  required
                  className="mt-1 w-full border rule bg-white/50 px-3 py-2 outline-none focus:border-ink"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-[10px] uppercase tracking-[0.1em] text-greyx">
                Portfolio & what you need
              </span>
              <textarea
                name="message"
                rows={4}
                className="mt-1 w-full border rule bg-white/50 px-3 py-2 outline-none focus:border-ink"
              />
            </label>
            <Button tone="primary">Request enterprise demo</Button>
          </form>
        )}
      </div>
    </div>
  )
}
