import { Role } from '../engine/seed/types'
import { hashString } from '../engine/simulators/realism'

/**
 * Demo access layer (Addendum F §2). These are VISIBLE demo credentials,
 * not real auth — no hashing, no account security (wasted effort + risk of
 * being mistaken for real). One shared password keeps stage use
 * frictionless and clearly signals "demo". Each credential maps to a
 * persona, its RBAC role, and its dataset scope.
 *
 * Shared by the client (login screen) and the server (session endpoint +
 * per-request scoping), so the two can never disagree.
 */

export const DEMO_PASSWORD = 'keystone'

export interface DemoCredential {
  email: string
  personaId: string
  role: Role
  label: string
  landsOn: string
}

export const CREDENTIALS: DemoCredential[] = [
  { email: 'laurent@meridian-sci.demo', personaId: 'a1-meridian', role: 'owner', label: 'Meridian Properties SCI — mid landlord', landsOn: 'Owner dashboard' },
  { email: 'sofia@jansen.demo', personaId: 'a2-sofia', role: 'owner', label: 'Sofia Jansen — solo landlord (Basic tier)', landsOn: 'Owner dashboard' },
  { email: 'ops@gestion-haussmann.demo', personaId: 'b1-haussmann', role: 'property_manager', label: 'Gestion Haussmann — property manager, 850 units', landsOn: 'Owner roll-up' },
  { email: 'admin@wonen-rijnland.demo', personaId: 'b2-rijnland', role: 'institution', label: 'Stichting Wonen Rijnland — housing association (white-label)', landsOn: 'Institution dashboard' },
  { email: 'cfo@ibervia-living.demo', personaId: 'b3-ibervia', role: 'institution', label: 'Ibervia Living SOCIMI — institutional BTR', landsOn: 'Refinancing readiness' },
  { email: 'partner@rentora.demo', personaId: 'c1-rentora', role: 'partner', label: 'Rentora Software — PMS partner', landsOn: 'Partner Console' },
]

export function findCredential(email: string, password: string): DemoCredential | null {
  if (password !== DEMO_PASSWORD) return null
  const normalized = email.trim().toLowerCase()
  return CREDENTIALS.find((c) => c.email === normalized) ?? null
}

export function credentialForPersona(personaId: string): DemoCredential | null {
  return CREDENTIALS.find((c) => c.personaId === personaId) ?? null
}

/**
 * Demo session token: deterministic, verifiable server-side without any
 * secret store. NOT security — it exists so the API can genuinely refuse
 * cross-persona reads (RBAC that is real, not cosmetic).
 */
export function mintToken(personaId: string): string {
  return `demo.${personaId}.${hashString('keystone-demo-session', personaId).toString(16)}`
}

/** Returns the personaId the token is scoped to, or null if invalid. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'demo') return null
  return mintToken(parts[1]) === token ? parts[1] : null
}
