import { ReactNode, useEffect, useRef, useState } from 'react'
import { useApp, Screen } from './store'
import { formatDate } from './format'
import { Badge, ToastHost, ViewErrorBoundary } from './components'
import { buildNotices, Notice } from './notifications'
import { NAV_BY_ROLE } from './rbac'
import DemoPanel from './DemoPanel'
import CommandBar from './CommandBar'
import Dashboard from './screens/Dashboard'
import Compliance from './screens/Compliance'
import Money from './screens/Money'
import Leases from './screens/Leases'
import CardSpend from './screens/CardSpend'
import Savings from './screens/Savings'
import Reports from './screens/Reports'
import OwnerRollup from './screens/OwnerRollup'
import LenderPack from './screens/LenderPack'
import PartnerConsole from './screens/PartnerConsole'
import Rails from './screens/Rails'
import System from './screens/System'

const NAV_ITEMS: Record<Screen, string> = {
  dashboard: 'Dashboard',
  rollup: 'Owner roll-up',
  lenderpack: 'Refi readiness',
  leases: 'Properties & Leases',
  compliance: 'Deposits & Compliance',
  money: 'Money',
  rails: 'Money rails',
  card: 'Card & Spend',
  savings: 'Savings Engine',
  reports: 'Reports',
  partner: 'Partner Console',
  system: 'System',
}

const SCREENS: Record<Screen, () => ReactNode> = {
  dashboard: () => <Dashboard />,
  rollup: () => <OwnerRollup />,
  lenderpack: () => <LenderPack />,
  leases: () => <Leases />,
  compliance: () => <Compliance />,
  money: () => <Money />,
  card: () => <CardSpend />,
  savings: () => <Savings />,
  reports: () => <Reports />,
  partner: () => <PartnerConsole />,
  rails: () => <Rails />,
  system: () => <System />,
}

/** Money screens carry the expansion watermark for preview-market personas. */
const WATERMARKED: Screen[] = ['money', 'card', 'savings', 'reports']

export default function Shell() {
  const { screen, setScreen, world, rev, demoClean, mutate, whiteLabel, dataSource, session, logout } =
    useApp()
  void rev
  const [panelOpen, setPanelOpen] = useState(false)

  const persona = world.state.persona
  const nav = [
    ...NAV_BY_ROLE[persona.role].filter(
      (id) => id !== 'lenderpack' || persona.lenderPack !== undefined,
    ),
    // §6 "open the hood" — for technical judges; hidden in ?demo=clean.
    ...(!demoClean ? (['system'] as Screen[]) : []),
  ]
  const brandName =
    persona.themeOverride && whiteLabel ? persona.themeOverride.name : 'Keystone'

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r rule px-5 py-6">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-tight">{brandName}</div>
          <div className="mt-0.5 text-[11px] text-greyx">{persona.name}</div>
          {persona.themeOverride && whiteLabel && (
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-greyx">
              powered by Keystone
            </div>
          )}
        </div>
        <nav className="space-y-1">
          {nav.map((id) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`block w-full border-l-2 px-3 py-1.5 text-left text-sm ${
                screen === id
                  ? 'border-brass font-medium'
                  : 'border-transparent text-greyx hover:text-ink'
              }`}
            >
              {NAV_ITEMS[id]}
            </button>
          ))}
        </nav>
        {/* F §2.3: logout returns to the landing Home; data persists. */}
        <div className="mt-8 border-t rule pt-4">
          {session?.email && (
            <div className="mb-1.5 truncate text-[11px] text-greyx" title={session.email}>
              {session.email}
            </div>
          )}
          <button
            onClick={logout}
            className="text-xs text-greyx underline-offset-2 hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b rule px-8 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-greyx">Demo date</span>
            <span className="font-medium">{formatDate(world.today)}</span>
            <button
              className="border rule px-2 py-0.5 text-xs hover:border-ink"
              onClick={() => mutate((w) => w.advanceDays(1))}
            >
              +1 day
            </button>
            <button
              className="border rule px-2 py-0.5 text-xs hover:border-ink"
              onClick={() => mutate((w) => w.advanceMonths(1))}
            >
              +1 month
            </button>
            {!demoClean && (
              <span
                className="text-[10px] uppercase tracking-[0.08em] text-greyx"
                title="Every figure folds from the append-only journal — the audit trail is the architecture."
              >
                {dataSource === 'api' ? '⟳ synced · persisted dataset' : '⟳ local engine'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CommandBar />
            <NotificationBell />
            <Badge tone="ink">{persona.role.replace('_', ' ')}</Badge>
            {!demoClean && <Badge tone="grey">Simulated rails</Badge>}
            <Badge tone="green">KYC verified</Badge>
            {!demoClean && (
              <button
                onClick={() => setPanelOpen(!panelOpen)}
                title="Demo controls"
                className="ml-1 text-lg text-greyx hover:text-ink"
              >
                ⚙
              </button>
            )}
          </div>
        </header>
        <main className="px-8 py-6">
          {persona.watermark && WATERMARKED.includes(screen) && (
            <div className="mb-4 border border-brass bg-white/50 px-4 py-2 text-sm text-brass">
              {persona.watermark}
            </div>
          )}
          {/* §2: one component can never white-screen the demo. */}
          <ViewErrorBoundary key={screen} label={NAV_ITEMS[screen]}>
            {SCREENS[screen]?.() ?? <Dashboard />}
          </ViewErrorBoundary>
        </main>
      </div>
      {panelOpen && !demoClean && <DemoPanel onClose={() => setPanelOpen(false)} />}
      <ToastHost />
    </div>
  )
}

/** §4 notification center: derived live from findings, clocks, arrears and the journal tail. */
function NotificationBell() {
  const { world, rev, setScreen, setFocus } = useApp()
  void rev
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notices = buildNotices(world)
  const actionable = notices.filter((n) => n.severity === 'act').length

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const go = (notice: Notice) => {
    setOpen(false)
    if (notice.focus) setFocus(notice.focus)
    setScreen(notice.screen)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Notifications"
        aria-label={`Notifications — ${actionable} need action`}
        className="relative border rule px-2 py-0.5 text-xs text-greyx hover:border-ink hover:text-ink"
      >
        ◷ {notices.length}
        {actionable > 0 && (
          <span className="absolute -right-1 -top-1 inline-block h-2 w-2 rounded-full bg-[#B4392E]" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-96 border rule bg-paper">
          <div className="border-b rule px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-greyx">
            What changed · what needs you
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notices.length === 0 && (
              <div className="px-3 py-4 text-sm text-greyx">All clear — nothing needs attention.</div>
            )}
            {notices.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n)}
                className="block w-full border-b rule px-3 py-2 text-left last:border-b-0 hover:bg-white/60"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      n.severity === 'act'
                        ? 'bg-[#B4392E]'
                        : n.severity === 'watch'
                          ? 'bg-brass'
                          : 'bg-[#3D6B47]'
                    }`}
                  />
                  <span className="font-medium">{n.title}</span>
                </div>
                <div className="mt-0.5 truncate pl-4 text-xs text-greyx">{n.detail}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
