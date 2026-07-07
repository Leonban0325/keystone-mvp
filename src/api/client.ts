import { DemoWorld, WorldSnapshot } from '../engine/world'
import { JournalEvent } from '../engine/ledger/types'
import { PersonaSeed } from '../engine/seed/types'

/**
 * Front-end API client (Addendum D §3). When the back-end is reachable the
 * browser QUERIES the persisted curated dataset and POSTS mutations — it
 * generates nothing. When it isn't (static hosting, network off on stage),
 * every call fails fast and the store falls back to the local deterministic
 * generator: the demo never depends on the network.
 */

export type DataSource = 'api' | 'local'

export interface ServerDataset {
  persona: PersonaSeed
  state: Omit<WorldSnapshot, 'events'>
  events: JournalEvent[]
}

const TIMEOUT_MS = 4000

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // F §3: every request carries the demo session token; the server refuses
    // cross-persona reads — RBAC enforced in data, not just navigation.
    const headers = new Headers(init?.headers)
    const token = sessionToken()
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`)
    return await fetch(path, { ...init, headers, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function sessionToken(): string | null {
  try {
    const raw = sessionStorage.getItem('keystone-session-v1')
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? null) : null
  } catch {
    return null
  }
}

/** Demo sign-in against the back-end (F §2). Null → caller validates locally. */
export async function loginViaApi(
  email: string,
  password: string,
): Promise<{ personaId: string; role: import('../engine/seed/types').Role; token: string } | null> {
  try {
    const res = await apiFetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    return (await res.json()) as { personaId: string; role: import('../engine/seed/types').Role; token: string }
  } catch {
    return null
  }
}

/** Load the persisted dataset and rebuild the world from it. Null → fall back local. */
export async function fetchWorld(
  personaId: string,
): Promise<{ world: DemoWorld; baseSeq: number } | null> {
  try {
    const res = await apiFetch(`/api/dataset?persona=${encodeURIComponent(personaId)}`)
    if (!res.ok) return null
    const dataset = (await res.json()) as ServerDataset
    if (!dataset?.persona || !dataset?.state || !Array.isArray(dataset.events)) return null
    const world = new DemoWorld(
      { ...dataset.persona, events: [] },
      { ...dataset.state, events: dataset.events },
    )
    return { world, baseSeq: dataset.events.length }
  } catch {
    return null
  }
}

/**
 * Append events the browser produced (remediation, clock ticks, savings…).
 * The server replays them through its own Journal — invariants are enforced
 * server-side — and 409s on concurrent writers.
 */
export async function pushEvents(
  personaId: string,
  baseSeq: number,
  events: JournalEvent[],
  state: Omit<WorldSnapshot, 'events'>,
): Promise<{ seq: number } | 'conflict' | null> {
  try {
    const res = await apiFetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ personaId, baseSeq, events, state }),
    })
    if (res.status === 409) return 'conflict'
    if (!res.ok) return null
    return (await res.json()) as { seq: number }
  } catch {
    return null
  }
}

/** Regenerate the curated dataset server-side (demo-panel reset). */
export async function resetServer(personaId?: string): Promise<boolean> {
  try {
    const res = await apiFetch(
      `/api/admin/reset${personaId ? `?persona=${encodeURIComponent(personaId)}` : ''}`,
      { method: 'POST' },
    )
    return res.ok
  } catch {
    return false
  }
}

export interface ExtractResult {
  fields: Record<string, unknown>
  confidence: Record<string, number>
  source: 'live' | 'canned'
}

/** Server-side AI extraction — the key never reaches the browser. Null → use the local canned path. */
export async function extractViaApi(text: string): Promise<ExtractResult | null> {
  try {
    const res = await apiFetch('/api/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ExtractResult
    return data?.fields ? data : null
  } catch {
    return null
  }
}

export interface SystemInfo {
  endpoints: string[]
  storage: string
  aiKeyConfigured: boolean
  journalCounts: { persona_id: string; events: number }[]
  rulesets: { jurisdiction: string; version: string }[]
  recentEvents: unknown[]
}

/** §6 "open the hood": server counts, rulesets, endpoints. Null → API off. */
export async function fetchSystem(personaId: string): Promise<SystemInfo | null> {
  try {
    const res = await apiFetch(`/api/system?persona=${encodeURIComponent(personaId)}`)
    if (!res.ok) return null
    return (await res.json()) as SystemInfo
  } catch {
    return null
  }
}

export interface QueryResponse {
  rows: Record<string, unknown>[]
  summary: string
  dsl: unknown
  source: 'live' | 'canned'
}

/** Natural-language portfolio query. Null → caller runs the local canned matcher. */
export async function queryViaApi(personaId: string, question: string): Promise<QueryResponse | null> {
  try {
    const res = await apiFetch(`/api/query?persona=${encodeURIComponent(personaId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) return null
    return (await res.json()) as QueryResponse
  } catch {
    return null
  }
}
