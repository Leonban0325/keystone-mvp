import { FormEvent, useState } from 'react'
import { Route, useApp } from '../store'
import { Button } from '../components'
import { PARTNER_BANK } from '../../config'

/**
 * The public face (Addendum F §1): an institutional marketing site in the
 * Keystone editorial-financial aesthetic. Every fresh visit starts here;
 * Client Access is the door into the product. Nothing claims a live
 * service; partner rails are named by category.
 */

const NAV: { route: Route; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'firm', label: 'The Firm' },
  { route: 'services', label: 'Services' },
  { route: 'insight', label: 'Insight' },
  { route: 'access', label: 'Client Access' },
  { route: 'contact', label: 'Contact' },
]

export default function Landing(props: { section: Route; children?: React.ReactNode }) {
  const { navigate } = useApp()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b rule">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <button className="flex items-baseline gap-2 text-left" onClick={() => navigate('home')}>
            <ArchMark />
            <span className="text-lg font-semibold tracking-tight">Keystone</span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-greyx sm:inline">
              Financial infrastructure for rental real estate
            </span>
          </button>
          <nav className="flex items-center gap-5 text-sm">
            {NAV.map((item) => (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`${
                  props.section === item.route
                    ? 'border-b-2 border-brass font-medium text-ink'
                    : 'text-greyx hover:text-ink'
                } ${item.route === 'access' ? 'border border-ink px-3 py-1 !text-ink hover:bg-ink hover:!text-paper' : 'pb-0.5'}`}
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 text-[11px] text-greyx">
          <span>© 2026 Keystone Financial Technologies · Paris — Amsterdam</span>
          <span>
            Demonstration environment — simulated rails, curated data. Nothing on this site is a
            live regulated service.
          </span>
        </div>
      </footer>
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

// ── §1.1 Home ────────────────────────────────────────────────────────────────

function Home() {
  const { navigate } = useApp()
  return (
    <div>
      <section className="border-b rule py-20">
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <ArchMark size={44} />
            <span className="text-[11px] uppercase tracking-[0.22em] text-greyx">
              Keystone · est. 2026
            </span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            The financial operating system for European rental real estate.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-greyx">
            Rent rails, statutory deposit custody, treasury yield and compliance — six regimes,
            one account, every euro on a double-entry ledger.
          </p>
          <div className="mt-8 flex gap-3">
            <Button tone="primary" onClick={() => navigate('access')}>
              Client Access
            </Button>
            <Button tone="quiet" onClick={() => navigate('contact')}>
              Request a demo
            </Button>
          </div>
        </div>
      </section>

      {/* Proof strip — category-truthful, no real logos. */}
      <section className="grid grid-cols-4 divide-x rule border-b rule text-center">
        {[
          ['FR · NL · ES', 'markets live'],
          ['DE · AT · IT', 'engine-ready'],
          ['6 statutory regimes', 'one account'],
          ['BaFin-regulated banking + escrow-as-a-service rails', 'built on'],
        ].map(([value, label]) => (
          <div key={label} className="px-4 py-6">
            <div className="text-sm font-semibold">{value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-greyx">{label}</div>
          </div>
        ))}
      </section>

      {/* Three value pillars — one line each. */}
      <section className="grid grid-cols-3 gap-10 border-b rule py-14">
        {[
          ['Compliance-native', 'Deposit caps, return clocks and lodgement duties encoded as versioned rules — legal by construction, not by checklist.'],
          ['Yield on idle cash', 'Segregated deposits and reserves earn at the policy rate; owners keep 60% of every basis point.'],
          ['One operating system', 'Collections, custody, spend, bookkeeping and reporting on a single dimensioned ledger — auditable to the cent.'],
        ].map(([title, line]) => (
          <div key={title}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-greyx">{line}</p>
          </div>
        ))}
      </section>

      {/* How it works — the money-rails concept. */}
      <section className="py-14">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-greyx">How it works</h2>
        <div className="mt-5 grid grid-cols-4 gap-0 text-sm">
          {[
            ['Tenant', 'pays by SEPA direct debit to a per-lease virtual IBAN'],
            ['Escrow layer', 'an EMI/escrow-as-a-service provider moves the money'],
            ['Partner bank', 'client funds sit segregated, DGS-protected, insolvency-remote'],
            ['Keystone', 'orchestrates every step — and never holds the money'],
          ].map(([title, line], i) => (
            <div key={title} className="flex items-stretch">
              {i > 0 && <div className="flex w-6 items-center justify-center text-greyx">▶</div>}
              <div className={`flex-1 border p-4 ${i === 3 ? 'border-dashed rule' : 'rule bg-white/40'}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">{title}</div>
                <div className="mt-1 text-xs leading-relaxed text-greyx">{line}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-greyx">
          Client funds never enter Keystone's balance sheet — control, not custody. Sign in to see
          the rails live over the ledger.
        </div>
      </section>
    </div>
  )
}

// ── §1.2 The Firm ────────────────────────────────────────────────────────────

const FOUNDERS = [
  ['Leon Ban', 'Co-founder'],
  ['Duong Bui', 'Co-founder'],
  ['Mark Gebrane', 'Co-founder'],
  ['Bariah Al-besharah', 'Co-founder'],
]

function Firm() {
  return (
    <div className="max-w-3xl py-14">
      <h1 className="text-2xl font-semibold tracking-tight">The Firm</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-greyx">
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

      <h2 className="mt-12 text-[11px] uppercase tracking-[0.18em] text-greyx">Founders</h2>
      <div className="mt-4 grid grid-cols-4 gap-4">
        {FOUNDERS.map(([name, role]) => (
          <div key={name} className="border rule bg-white/40 p-4">
            <div className="text-sm font-semibold">{name}</div>
            <div className="mt-0.5 text-xs text-greyx">{role}</div>
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

// ── §1.3 Services ────────────────────────────────────────────────────────────

const SERVICE_GROUPS: [string, string[]][] = [
  ['Banking & rent rails', ['Per-lease virtual IBANs, SEPA direct-debit collection, R-transaction dunning', 'Owner payout waterfalls with reserve floors and vendor netting']],
  ['Deposit custody & statutory compliance', ['Segregated, DGS-protected deposit custody across FR · NL · ES (DE · AT · IT engine-ready)', 'Six-regime rules-as-code: caps, return clocks, lodgement, tenant interest — with one-click remediation']],
  ['Treasury & yield', ['Idle deposits and reserves earn at the policy rate; owners keep 60% of every basis point', 'Flat-fee failsafe when rates fall — the floor holds']],
  ['Card, spend & books', ['Property cards with per-property routing and category locks, every swipe pre-coded', 'FEC-style exports and quittances the accountant accepts as-is']],
  ['Savings & optimisation', ['Five always-on detectors: property tax, utilities, vendors, insurance, subsidies — success-fee only', 'NOI bridge and asset-value impact on every executed opportunity']],
  ['Analytics', ['Portfolio → owner → property → lease roll-ups over the dimensioned ledger', 'Covenant monitoring, refinancing readiness and benchmarking for institutional stock']],
]

function Services() {
  return (
    <div className="py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
      <p className="mt-3 max-w-2xl text-sm text-greyx">
        One account for the financial life of a rental portfolio — priced per unit, from solo
        landlords to listed BTR.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-8">
        {SERVICE_GROUPS.map(([group, lines]) => (
          <div key={group} className="border-t rule pt-4">
            <h3 className="text-sm font-semibold">{group}</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-greyx">
              {lines.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 border rule bg-white/40 p-5 text-sm text-greyx">
        <span className="font-semibold text-ink">Who we serve.</span> Small and mid-size
        landlords on self-serve tiers · enterprise — property managers, housing associations and
        institutional BTR — under white-label and procurement-grade terms · software platforms
        and banks through partnership distribution.
      </div>
    </div>
  )
}

// ── §1.4 Insight ─────────────────────────────────────────────────────────────

const ARTICLES = [
  ['The idle billions in Europe’s rental deposits', 'Tenant deposits across FR·NL·ES·DE sit largely unremunerated in commingled accounts. What segregation plus the deposit facility rate does to that picture — and who should keep the yield.'],
  ['Six regimes, one obligation', 'Deposit caps, return clocks and lodgement duties differ across every major European market. Why compliance-as-code beats compliance-as-checklist for anyone operating across borders.'],
  ['Europe’s 2026–28 refinancing wall', 'A large share of institutional rental debt reprices within 36 months. Covenant-ready books — DSCR, LTV, occupancy, EPC — will decide who refinances on terms.'],
  ['R-transactions are a data problem', 'Most failed rent collections recover within one cycle. The operators who know which ones won’t are running dunning as a state machine, not a spreadsheet.'],
]

function Insight() {
  return (
    <div className="py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Insight</h1>
      <p className="mt-3 max-w-2xl text-sm text-greyx">
        Research notes from the desk — on deposit capital, statutory fragmentation and the
        operating economics of European rentals.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        {ARTICLES.map(([title, summary]) => (
          <article key={title} className="border rule bg-white/40 p-5">
            <h3 className="text-base font-semibold leading-snug">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-greyx">{summary}</p>
            <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-brass">
              Full note — coming soon
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ── §1.6 Contact ─────────────────────────────────────────────────────────────

function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    // Demo posture: the form logs — no CRM claims a live service.
    console.info('[keystone] contact request', data)
    setSent(true)
  }
  return (
    <div className="grid max-w-4xl grid-cols-2 gap-12 py-14">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
        <p className="mt-3 text-sm leading-relaxed text-greyx">
          For enterprise demonstrations — property managers, housing associations, institutional
          portfolios and platform partnerships — write to the desk directly.
        </p>
        <div className="mt-8 space-y-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-greyx">Head office</div>
            <div className="mt-0.5">10 rue de Penthièvre, 75008 Paris</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-greyx">Enterprise</div>
            <div className="mt-0.5">enterprise@keystone.demo</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-greyx">Partnerships</div>
            <div className="mt-0.5">partners@keystone.demo</div>
          </div>
        </div>
      </div>
      <div>
        {sent ? (
          <div className="border rule bg-white/40 p-6 text-sm">
            <div className="font-semibold">Request received.</div>
            <div className="mt-1 text-greyx">
              The desk will come back to you within one business day. (Demo environment — the
              request was logged, not sent.)
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
                <span className="text-[10px] uppercase tracking-[0.14em] text-greyx">{label}</span>
                <input
                  name={name}
                  type={type}
                  required
                  className="mt-1 w-full border rule bg-white/50 px-3 py-2 outline-none focus:border-ink"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-[10px] uppercase tracking-[0.14em] text-greyx">
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
