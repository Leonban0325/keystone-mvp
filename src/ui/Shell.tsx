import { ReactNode, useState } from 'react'
import { useApp, Screen } from './store'
import { formatDate } from './format'
import { Badge } from './components'
import { Role } from '../engine/seed/types'
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
import System from './screens/System'

const NAV_ITEMS: Record<Screen, string> = {
  dashboard: 'Dashboard',
  rollup: 'Owner roll-up',
  lenderpack: 'Refi readiness',
  leases: 'Properties & Leases',
  compliance: 'Deposits & Compliance',
  money: 'Money',
  card: 'Card & Spend',
  savings: 'Savings Engine',
  reports: 'Reports',
  partner: 'Partner Console',
  system: 'System',
}

/** UI-only RBAC: the engine never changes — that IS the demo point. */
const NAV_BY_ROLE: Record<Role, Screen[]> = {
  owner: ['dashboard', 'leases', 'compliance', 'money', 'card', 'savings', 'reports'],
  property_manager: ['dashboard', 'rollup', 'leases', 'compliance', 'money', 'card', 'savings', 'reports'],
  institution: ['dashboard', 'lenderpack', 'leases', 'compliance', 'money', 'card', 'reports'],
  partner: ['partner'],
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
  system: () => <System />,
}

/** Money screens carry the expansion watermark for preview-market personas. */
const WATERMARKED: Screen[] = ['money', 'card', 'savings', 'reports']

export default function Shell() {
  const { screen, setScreen, world, rev, demoClean, mutate, whiteLabel } = useApp()
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
          </div>
          <div className="flex items-center gap-2">
            <CommandBar />
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
          {SCREENS[screen]?.() ?? <Dashboard />}
        </main>
      </div>
      {panelOpen && !demoClean && <DemoPanel onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
