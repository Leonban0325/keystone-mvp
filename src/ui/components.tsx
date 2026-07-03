import { ReactNode } from 'react'
import { Severity } from '../engine/compliance/types'

export function Card(props: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border rule bg-white/40 p-5 ${props.className ?? ''}`}>
      {props.title && (
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-greyx">
          {props.title}
        </h3>
      )}
      {props.children}
    </section>
  )
}

export function Stat(props: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-greyx">{props.label}</div>
      <div className="mt-1 text-2xl font-semibold">{props.value}</div>
      {props.sub && <div className="mt-1 text-xs text-greyx">{props.sub}</div>}
    </div>
  )
}

const SEVERITY_COLOR: Record<Severity, string> = {
  violation: '#B4392E',
  warning: '#B98A2F',
  info: '#6E7680',
}

export function SeverityDot(props: { severity: Severity }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: SEVERITY_COLOR[props.severity] }}
      title={props.severity}
    />
  )
}

export function Badge(props: { children: ReactNode; tone?: 'ink' | 'brass' | 'grey' | 'red' | 'green' }) {
  const tones = {
    ink: 'border-ink text-ink',
    brass: 'border-brass text-brass',
    grey: 'border-hairline text-greyx',
    red: 'border-[#B4392E] text-[#B4392E]',
    green: 'border-[#3D6B47] text-[#3D6B47]',
  }
  return (
    <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${tones[props.tone ?? 'grey']}`}>
      {props.children}
    </span>
  )
}

export function Button(props: {
  children: ReactNode
  onClick?: () => void
  tone?: 'primary' | 'quiet'
  disabled?: boolean
  title?: string
}) {
  const styles =
    props.tone === 'primary'
      ? 'bg-ink text-paper hover:bg-ink/90'
      : 'border rule text-ink hover:border-ink'
  return (
    <button
      className={`px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  )
}

/** Compliance status ring: green = clean leases, amber = warnings, red = violations. */
export function StatusRing(props: { total: number; warnings: number; violations: number }) {
  const { total, warnings, violations } = props
  const clean = Math.max(0, total - warnings - violations)
  const r = 34
  const c = 2 * Math.PI * r
  const seg = (n: number) => (total === 0 ? 0 : (n / total) * c)
  let offset = 0
  const arcs: { len: number; color: string }[] = [
    { len: seg(clean), color: '#3D6B47' },
    { len: seg(warnings), color: '#B98A2F' },
    { len: seg(violations), color: '#B4392E' },
  ]
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label="Compliance status">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--hairline)" strokeWidth="8" />
      {arcs.map((arc, i) => {
        const el = (
          <circle
            key={i}
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="8"
            strokeDasharray={`${arc.len} ${c - arc.len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 44 44)"
          />
        )
        offset += arc.len
        return el
      })}
      <text x="44" y="41" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink)">
        {violations}
      </text>
      <text x="44" y="56" textAnchor="middle" fontSize="9" fill="var(--grey)">
        {violations === 1 ? 'violation' : 'violations'}
      </text>
    </svg>
  )
}
