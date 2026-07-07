import { Role } from '../engine/seed/types'

/**
 * Demo session (Addendum F §2.3). Lives in sessionStorage: a fresh
 * visit (new tab/window, or after logout) has no session and lands on the
 * marketing Home — while a mid-demo reload in the same tab stays signed in.
 * The token scopes API reads to the persona; nothing here is real auth.
 * Data is NOT touched by login/logout — the persisted datasets survive.
 */

export interface Session {
  personaId: string
  role: Role
  token: string
  email?: string
}

const KEY = 'keystone-session-v1'

export function getStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    return session?.personaId && session?.token ? session : null
  } catch {
    return null
  }
}

export function storeSession(session: Session): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // sessionStorage unavailable — the in-memory session still works.
  }
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
