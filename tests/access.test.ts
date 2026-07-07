import { describe, expect, it } from 'vitest'
import { route } from '../server/handlers'
import {
  CREDENTIALS,
  DEMO_PASSWORD,
  findCredential,
  mintToken,
  verifyToken,
} from '../src/access/credentials'

/**
 * Addendum F: the access layer. Demo credentials sign in, tokens scope the
 * API to one persona, and cross-persona reads are refused SERVER-SIDE —
 * RBAC that is real, not cosmetic. (These paths run before any database
 * work, so the pack stays fast and hermetic.)
 */

describe('F §2 — demo credentials & session issuance', () => {
  it('all six persona logins resolve with the shared demo password', () => {
    expect(CREDENTIALS).toHaveLength(6)
    for (const c of CREDENTIALS) {
      const hit = findCredential(c.email, DEMO_PASSWORD)
      expect(hit?.personaId).toBe(c.personaId)
      expect(hit?.role).toBe(c.role)
    }
  })

  it('wrong password or unknown email is refused', () => {
    expect(findCredential('laurent@meridian-sci.demo', 'nope')).toBeNull()
    expect(findCredential('mallory@nowhere.demo', DEMO_PASSWORD)).toBeNull()
  })

  it('POST /api/session issues a persona-scoped token', async () => {
    const res = await route({
      method: 'POST',
      path: 'session',
      query: {},
      body: { email: 'ops@gestion-haussmann.demo', password: DEMO_PASSWORD },
    })
    expect(res.status).toBe(200)
    const body = res.body as { token: string; personaId: string; role: string }
    expect(body.personaId).toBe('b1-haussmann')
    expect(body.role).toBe('property_manager')
    expect(verifyToken(body.token)).toBe('b1-haussmann')
  })

  it('POST /api/session refuses bad credentials', async () => {
    const res = await route({
      method: 'POST',
      path: 'session',
      query: {},
      body: { email: 'laurent@meridian-sci.demo', password: 'wrong' },
    })
    expect(res.status).toBe(401)
  })
})

describe('F §3 — server-side data scoping', () => {
  it('a token cannot read another persona’s data (403, before any db work)', async () => {
    const sofia = mintToken('a2-sofia')
    for (const path of ['portfolio', 'dataset', 'compliance', 'savings', 'rollup']) {
      const res = await route({
        method: 'GET',
        path,
        query: { persona: 'b1-haussmann' },
        token: sofia,
      })
      expect(res.status, path).toBe(403)
      expect(String((res.body as { error: string }).error)).toContain('a2-sofia')
    }
  })

  it('a token cannot mutate another persona’s journal either', async () => {
    const res = await route({
      method: 'POST',
      path: 'events',
      query: {},
      body: { personaId: 'b1-haussmann', baseSeq: 0, events: [], state: {} },
      token: mintToken('a1-meridian'),
    })
    expect(res.status).toBe(403)
  })

  it('a forged or mangled token is rejected outright (401)', async () => {
    const res = await route({
      method: 'GET',
      path: 'portfolio',
      query: { persona: 'a1-meridian' },
      token: 'demo.a1-meridian.deadbeef',
    })
    expect(res.status).toBe(401)
  })

  it('tokens are deterministic and persona-bound', () => {
    expect(verifyToken(mintToken('a1-meridian'))).toBe('a1-meridian')
    expect(verifyToken(mintToken('a1-meridian').replace('a1', 'b1'))).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
    expect(verifyToken('garbage')).toBeNull()
  })
})
