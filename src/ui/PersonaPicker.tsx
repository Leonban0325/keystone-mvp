import { useApp } from './store'
import { Badge } from './components'
import { buildPersona, personaIds } from '../engine/seed/personas'
import { PRICING } from '../engine/simulators/economics'

const SEGMENT_LABELS: Record<string, string> = {
  A: 'Small & mid landlords',
  B: 'Enterprise',
  C: 'Partnership distribution',
}

/** Login-style persona picker — itself a pitch visual: one product, three segments. */
export default function PersonaPicker() {
  const { switchPersona } = useApp()
  const personas = personaIds().map(buildPersona)
  const segments = ['A', 'B', 'C'] as const

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 py-12">
      <div className="mb-1 text-2xl font-semibold tracking-tight">Keystone</div>
      <div className="mb-10 text-sm text-greyx">
        Sign in as… <span className="text-brass">same ledger, same rules — different surface</span>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-3 gap-8">
        {segments.map((segment) => (
          <div key={segment}>
            <div className="mb-3 border-b rule pb-2 text-[11px] uppercase tracking-[0.14em] text-greyx">
              {segment} · {SEGMENT_LABELS[segment]}
            </div>
            <div className="space-y-3">
              {personas
                .filter((p) => p.segment === segment)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchPersona(p.id)}
                    className="block w-full border rule bg-white/40 p-4 text-left hover:border-ink"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.name}</span>
                      <Badge tone="brass">{p.role.replace('_', ' ')}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-greyx">{p.subtitle}</div>
                    <div className="mt-2 text-[11px] text-greyx">
                      {p.pricingTier} · €{(PRICING[p.pricingTier] / 100).toFixed(0)}/unit/mo
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-xs text-greyx">
        Switching resets the journal, loads the persona seed, sets the role, applies the theme.
      </div>
    </div>
  )
}
