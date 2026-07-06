import { useApp } from './store'
import { Property } from '../engine/seed/types'

/**
 * §7 map view — dependency-free positioned-pin SVG (offline-safe on stage;
 * no tile server). Pins are colored by compliance status, so the map doubles
 * as the portfolio-at-a-glance visual for the enterprise pitch.
 */

const CITY_COORDS: Record<string, [number, number]> = {
  // Paris-region entries are spread schematically so enterprise clusters
  // don't overlap — the map is abstract on purpose (offline-safe SVG).
  'Paris 8e': [40, 29],
  'Paris 9e': [50, 26],
  'Paris 17e': [45, 21],
  'Levallois-Perret': [36, 37],
  'Boulogne-Billancourt': [51, 40],
  Paris: [46, 33],
  Lyon: [52, 52],
  Amsterdam: [53, 16],
  Rotterdam: [51, 19],
  Leiden: [52, 18],
  Leiderdorp: [53, 18],
  Oegstgeest: [52, 17],
  Barcelona: [45, 81],
  Madrid: [28, 79],
  München: [70, 45],
}

const COUNTRY_LABELS: { label: string; x: number; y: number }[] = [
  { label: 'NL', x: 56, y: 14 },
  { label: 'DE', x: 72, y: 32 },
  { label: 'FR', x: 44, y: 48 },
  { label: 'ES', x: 26, y: 84 },
]

function cityBase(city: string): [number, number] {
  return Object.entries(CITY_COORDS).find(([key]) => city.startsWith(key))?.[1] ?? [50, 50]
}

function coordsFor(city: string, index: number): [number, number] {
  const base = cityBase(city)
  // Deterministic spiral jitter so co-located properties read as a cluster.
  const angle = index * 2.39996
  const radius = Math.min(0.4 + Math.sqrt(index) * 0.55, 4)
  return [base[0] + Math.cos(angle) * radius, base[1] + Math.sin(angle) * radius]
}

export type ComplianceTone = 'green' | 'amber' | 'red'

const TONE_COLOR: Record<ComplianceTone, string> = {
  green: '#3D6B47',
  amber: '#B98A2F',
  red: '#B4392E',
}

export default function PropertyMap(props: {
  statusByProperty: Map<string, ComplianceTone>
  onSelect: (propertyId: string) => void
  selected?: string | null
}) {
  const { world } = useApp()
  const properties = world.state.persona.properties

  // Enterprise portfolios: one cluster per city (sized by count, colored by
  // worst status) instead of 850 overlapping pins. Click → worst property.
  const clustered = properties.length > 60
  const cityIndex = new Map<string, number>()
  const toneRank: Record<ComplianceTone, number> = { green: 0, amber: 1, red: 2 }
  const pins = clustered
    ? []
    : [...properties]
        .map((property: Property) => {
          const n = cityIndex.get(property.city) ?? 0
          cityIndex.set(property.city, n + 1)
          const [x, y] = coordsFor(property.city, n)
          return { property, x, y, tone: props.statusByProperty.get(property.id) ?? ('green' as ComplianceTone) }
        })
        // Draw problem pins last so they stay visible in dense cities.
        .sort((a, b) => toneRank[a.tone] - toneRank[b.tone])

  const clusters = clustered
    ? [...properties
        .reduce((map, property) => {
          const key = property.city
          const row = map.get(key) ?? {
            city: key,
            count: 0,
            tone: 'green' as ComplianceTone,
            worstProperty: property.id,
          }
          row.count += 1
          const tone = props.statusByProperty.get(property.id) ?? 'green'
          if (toneRank[tone] > toneRank[row.tone]) {
            row.tone = tone
            row.worstProperty = property.id
          }
          return map.set(key, row)
        }, new Map<string, { city: string; count: number; tone: ComplianceTone; worstProperty: string }>())
        .values()]
    : []

  return (
    <div>
      <svg viewBox="0 0 100 100" className="mx-auto w-full max-w-2xl border rule bg-white/40">
        {/* hairline graticule */}
        {[20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="var(--hairline)" strokeWidth="0.15" />
            <line x1="0" y1={v} x2="100" y2={v} stroke="var(--hairline)" strokeWidth="0.15" />
          </g>
        ))}
        {/* rough coastline hints: Atlantic + Mediterranean, abstract on purpose */}
        <polyline
          points="18,10 22,22 18,34 24,44 20,56 26,66 22,74 30,90"
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="0.6"
        />
        <polyline
          points="30,90 44,86 52,88 66,84 84,88"
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="0.6"
        />
        <polyline
          points="44,10 50,14 56,10 64,14 74,10"
          fill="none"
          stroke="var(--hairline)"
          strokeWidth="0.6"
        />
        {COUNTRY_LABELS.map((c) => (
          <text key={c.label} x={c.x} y={c.y} fontSize="4" fill="var(--grey)" opacity="0.5">
            {c.label}
          </text>
        ))}
        {pins.map(({ property, x, y, tone }) => (
          <circle
            key={property.id}
            cx={x}
            cy={y}
            r={props.selected === property.id ? 1.6 : 1.05}
            fill={TONE_COLOR[tone]}
            stroke={props.selected === property.id ? 'var(--ink)' : 'white'}
            strokeWidth="0.25"
            className="cursor-pointer"
            onClick={() => props.onSelect(property.id)}
          >
            <title>
              {property.label}, {property.city}
            </title>
          </circle>
        ))}
        {clusters.map((cluster) => {
          const [x, y] = cityBase(cluster.city)
          const r = Math.min(1.6 + Math.sqrt(cluster.count) * 0.3, 4.5)
          return (
            <g key={cluster.city} className="cursor-pointer" onClick={() => props.onSelect(cluster.worstProperty)}>
              <circle cx={x} cy={y} r={r} fill={TONE_COLOR[cluster.tone]} fillOpacity="0.25" stroke={TONE_COLOR[cluster.tone]} strokeWidth="0.4" />
              <text x={x} y={y + 1} textAnchor="middle" fontSize="2.6" fill="var(--ink)">
                {cluster.count}
              </text>
              <text x={x} y={y + r + 2.4} textAnchor="middle" fontSize="2" fill="var(--grey)">
                {cluster.city}
              </text>
              <title>{`${cluster.city} — ${cluster.count} units`}</title>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-[11px] text-greyx">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TONE_COLOR.green }} />
          compliant
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TONE_COLOR.amber }} />
          warning
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: TONE_COLOR.red }} />
          violation
        </span>
        <span className="ml-4">click a pin for the property card</span>
      </div>
    </div>
  )
}
