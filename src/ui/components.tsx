import { Component, ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Severity } from '../engine/compliance/types'

/**
 * §1.4 the one section-label treatment: 11px small caps, 0.14em tracking,
 * grey. Every uppercase label in the app is this component (or Badge).
 */
export function SectionHeader(props: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-greyx ${props.className ?? ''}`}
    >
      {props.children}
    </h3>
  )
}

/** §1.5 the one disclosure affordance — same glyph, same width, everywhere. */
export function Chevron(props: { open: boolean }) {
  return (
    <span className="inline-block w-3 text-greyx" aria-hidden>
      {props.open ? '▾' : '▸'}
    </span>
  )
}

export function Card(props: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border rule bg-white/40 p-4 ${props.className ?? ''}`}>
      {props.title && <SectionHeader className="mb-3">{props.title}</SectionHeader>}
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

export type StatusTone = 'green' | 'amber' | 'red' | 'grey'

export const STATUS_COLOR: Record<StatusTone, string> = {
  green: '#3D6B47',
  amber: '#B98A2F',
  red: '#B4392E',
  grey: '#6E7680',
}

/** §1.5 the one status indicator — an 8px dot, four tones, everywhere. */
export function StatusDot(props: { tone: StatusTone; title?: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: STATUS_COLOR[props.tone] }}
      title={props.title}
    />
  )
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
    <span className={`whitespace-nowrap border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${tones[props.tone ?? 'grey']}`}>
      {props.children}
    </span>
  )
}

/**
 * §1.2 the one button. Two tones, two fixed sizes, an optional fixed width —
 * and it never wraps: a button that breaks to two lines reads as broken.
 */
export function Button(props: {
  children: ReactNode
  onClick?: () => void
  tone?: 'primary' | 'quiet'
  size?: 'sm' | 'md'
  disabled?: boolean
  title?: string
  className?: string
}) {
  const styles =
    props.tone === 'primary'
      ? 'bg-ink text-paper hover:bg-ink/90'
      : 'border rule text-ink hover:border-ink'
  const sizing = props.size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
  return (
    <button
      className={`whitespace-nowrap ${sizing} disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${props.className ?? ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  )
}

/**
 * §2.2 the trust mark — a small brass label over a thin brass underline, one
 * line always. No box: a bordered chip that wraps reads as broken, and a
 * broken trust mark undermines trust.
 */
export function TrustMark(props: { children: ReactNode; title?: string }) {
  return (
    <span
      className={`whitespace-nowrap border-b border-brass pb-px text-[10px] font-semibold uppercase tracking-[0.14em] text-brass ${
        props.title ? 'cursor-help' : ''
      }`}
      title={props.title}
    >
      {props.children}
    </span>
  )
}

/**
 * §2 deliberate empty state — a guided blank, never a panel that reads as a bug.
 */
export function EmptyState(props: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border rule border-dashed px-6 py-8 text-center">
      <div className="text-sm font-medium">{props.title}</div>
      {props.hint && <div className="mx-auto mt-1 max-w-sm text-xs text-greyx">{props.hint}</div>}
      {props.action && <div className="mt-3">{props.action}</div>}
    </div>
  )
}

/** §2 content-shaped loading skeleton (not a spinner). */
export function Skeleton(props: { lines?: number; className?: string }) {
  return (
    <div className={props.className} aria-hidden>
      {Array.from({ length: props.lines ?? 3 }, (_, i) => (
        <div key={i} className="skeleton mb-2 h-3" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  )
}

/**
 * §2 confirmation dialog — the four-eyes principle made visible. Rendered
 * before any money movement or remediation commits.
 */
export function ConfirmDialog(props: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])
  if (!props.open) return null
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25"
      onClick={props.onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={props.title}
    >
      <div className="w-full max-w-md border rule bg-paper p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold">{props.title}</h3>
        <div className="mt-2 text-sm text-greyx">{props.body}</div>
        <div className="mt-4 flex justify-end gap-2">
          <Button tone="quiet" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button tone="primary" onClick={props.onConfirm}>
            {props.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── §2 toast layer: money actions confirm on (simulated) settlement ──────────

export interface ToastMessage {
  id: number
  text: string
  tone: 'ok' | 'info'
}

let toastSeq = 0
let toastList: ToastMessage[] = []
const toastListeners = new Set<() => void>()

export function toast(text: string, tone: ToastMessage['tone'] = 'ok'): void {
  const id = ++toastSeq
  toastList = [...toastList, { id, text, tone }]
  toastListeners.forEach((fn) => fn())
  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== id)
    toastListeners.forEach((fn) => fn())
  }, 3800)
}

export function ToastHost() {
  const toasts = useSyncExternalStore(
    (onChange) => {
      toastListeners.add(onChange)
      return () => toastListeners.delete(onChange)
    },
    () => toastList,
  )
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in border rule bg-paper px-4 py-2 text-sm"
          role="status"
        >
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${t.tone === 'ok' ? 'bg-[#3D6B47]' : 'bg-brass'}`} />
          {t.text}
        </div>
      ))}
    </div>
  )
}

/** §3 numbers animate when they change — count-up over ~0.5s, tabular so nothing shifts. */
export function CountUp(props: { value: number; format: (v: number) => string }) {
  const [display, setDisplay] = useState(props.value)
  const fromRef = useRef(props.value)
  useEffect(() => {
    const from = fromRef.current
    const to = props.value
    if (from === to) return
    fromRef.current = to
    const started = performance.now()
    const duration = 480
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [props.value])
  return <span>{props.format(display)}</span>
}

/**
 * §2 error boundary per major view — one component can never white-screen
 * the demo. Recovery is a plain re-mount.
 */
export class ViewErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          title={`Something broke in ${this.props.label ?? 'this view'}.`}
          hint={String(this.state.error.message ?? this.state.error)}
          action={
            <Button tone="primary" onClick={() => this.setState({ error: null })}>
              Reload view
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}


/**
 * G §1: the single honest disclosure — plainly states what is real and what
 * is represented. One click away, never stamped on a working screen.
 */
export function AboutPrototypeDialog(props: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25"
      onClick={props.onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About this prototype"
    >
      <div className="w-full max-w-lg border rule bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">About this prototype</h3>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-greyx">
          <p>
            Keystone is a functioning prototype. The compliance engine, the double-entry ledger
            and the application logic are real: every figure folds from an append-only journal,
            every finding traces to a versioned statutory rule, and every action posts real
            accounting entries.
          </p>
          <p>
            Banking, payment, card and identity rails are{' '}
            <span className="text-ink">represented, not connected to live third-party
            services</span>. Money movement, settlement timing and verification results are
            produced by deterministic models over a curated twelve-month dataset — no live bank,
            scheme or identity provider is called.
          </p>
        </div>
        <div className="mt-4 text-right">
          <Button tone="quiet" onClick={props.onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
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
