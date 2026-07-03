import { ReactNode } from 'react'
import { useApp, Screen } from './store'
import { formatDate } from './format'
import { Badge } from './components'
import Dashboard from './screens/Dashboard'
import Compliance from './screens/Compliance'
import Money from './screens/Money'
import Leases from './screens/Leases'
import CardSpend from './screens/CardSpend'
import Savings from './screens/Savings'
import Reports from './screens/Reports'

const NAV: { id: Screen; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leases', label: 'Properties & Leases' },
  { id: 'compliance', label: 'Deposits & Compliance' },
  { id: 'money', label: 'Money' },
  { id: 'card', label: 'Card & Spend' },
  { id: 'savings', label: 'Savings Engine' },
  { id: 'reports', label: 'Reports' },
]

const SCREENS: Record<string, () => ReactNode> = {
  dashboard: () => <Dashboard />,
  leases: () => <Leases />,
  compliance: () => <Compliance />,
  money: () => <Money />,
  card: () => <CardSpend />,
  savings: () => <Savings />,
  reports: () => <Reports />,
}

export default function Shell() {
  const { screen, setScreen, world, rev, demoClean, mutate } = useApp()
  void rev

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r rule px-5 py-6">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-tight">Keystone</div>
          <div className="mt-0.5 text-[11px] text-greyx">{world.state.persona.name}</div>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`block w-full border-l-2 px-3 py-1.5 text-left text-sm ${
                screen === item.id
                  ? 'border-brass font-medium'
                  : 'border-transparent text-greyx hover:text-ink'
              }`}
            >
              {item.label}
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
            {!demoClean && <Badge tone="grey">Simulated rails</Badge>}
            <Badge tone="green">KYC verified</Badge>
          </div>
        </header>
        <main className="px-8 py-6">{SCREENS[screen]?.() ?? <Dashboard />}</main>
      </div>
    </div>
  )
}
