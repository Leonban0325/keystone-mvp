import { describe, expect, it } from 'vitest'
import { DemoWorld } from '../src/engine/world'
import { buildPersona } from '../src/engine/seed/personas'
import { advanceRecord, resolveUbos, startRecord } from '../src/engine/kyc'

/**
 * Addendum G §5: verification is EARNED. The flow is real — multi-step,
 * stateful, gated — and "verified" is only reachable by completing every
 * step (including each beneficial owner on the KYB path). Only the provider
 * call is represented, as deterministic results over curated data.
 */

describe('G §5 — KYC (individuals)', () => {
  it('gates strictly: no step can be skipped and the badge is never preset', () => {
    let record = startRecord('lease-x:tenant', 'Élodie Marchand', 'individual')
    expect(record.status).toBe('in_progress')
    expect(record.steps.map((s) => s.id)).toEqual(['document', 'liveness', 'screening'])

    record = advanceRecord(record, '2026-07-01')
    expect(record.steps[0].status).toBe('passed')
    expect(record.steps[1].status).toBe('pending') // liveness untouched
    expect(record.status).toBe('in_progress') // two gates still ahead

    record = advanceRecord(record, '2026-07-01')
    expect(record.status).toBe('in_progress')
    record = advanceRecord(record, '2026-07-01')
    expect(record.status).toBe('verified')
    expect(record.completedOn).toBe('2026-07-01')
    expect(record.steps.every((s) => s.result && s.result.length > 5)).toBe(true)
  })
})

describe('G §5 — KYB (companies, with UBO resolution)', () => {
  it('resolves beneficial owners deterministically and verifies each one', () => {
    const ubos = resolveUbos({ id: 'ent-meridian', name: 'Meridian Properties SCI', kind: 'sci' })
    expect(ubos.length).toBeGreaterThanOrEqual(1)
    expect(ubos.length).toBeLessThanOrEqual(3)
    expect(ubos.reduce((s, u) => s + u.sharePct, 0)).toBe(100)
    // Same input → same UBO structure, every run.
    expect(resolveUbos({ id: 'ent-meridian', name: 'x', kind: 'sci' })).toEqual(ubos)

    let record = startRecord('ent-meridian', 'Meridian Properties SCI', 'company')
    record = advanceRecord(record, '2026-07-01') // registry
    record = advanceRecord(record, '2026-07-01') // UBO resolution
    expect(record.ubos?.length).toBeGreaterThanOrEqual(1)

    // The ubo-kyc gate passes only when EVERY beneficial owner has passed.
    const uboCount = record.ubos!.length
    for (let i = 0; i < uboCount; i += 1) {
      expect(record.status).toBe('in_progress')
      record = advanceRecord(record, '2026-07-01')
      expect(record.ubos!.filter((u) => u.verified).length).toBe(i + 1)
    }
    expect(record.steps.find((s) => s.id === 'ubo-kyc')?.status).toBe('passed')

    expect(record.status).toBe('in_progress') // company screen still ahead
    record = advanceRecord(record, '2026-07-01')
    expect(record.status).toBe('verified')
  })
})

describe('G §5 — world integration & persistence', () => {
  it('records live on the world, and no party is verified by default', () => {
    const world = new DemoWorld(buildPersona('a1-meridian'))
    const entity = world.state.persona.entities[0]
    expect(world.verification(entity.id)).toBeUndefined() // earned, not preset

    world.startVerification(entity.id, entity.name, 'company')
    world.advanceVerification(entity.id)
    const record = world.verification(entity.id)!
    expect(record.status).toBe('in_progress')
    expect(record.steps[0].status).toBe('passed')

    // Survives the snapshot round-trip (localStorage + API state push).
    const revived = new DemoWorld(buildPersona('a1-meridian'), world.snapshot())
    expect(revived.verification(entity.id)?.steps[0].status).toBe('passed')
    expect(revived.verification(entity.id)?.status).toBe('in_progress')
  })
})
