import { keyedRand } from './simulators/realism'
import { FIRST_NAMES, LAST_NAMES } from './seed/personas/portfolio'
import { Entity } from './seed/types'

/**
 * KYC / KYB (Addendum G §5) — earned verification. The flow, the steps, the
 * gating, the UBO structure and the record kept are REAL: a party cannot
 * reach "verified" without passing every prior step in order, in-session.
 * Only the third-party provider call is represented — each step returns a
 * deterministic result derived from the curated data. No real document is
 * verified.
 */

export type VerificationStatus = 'unverified' | 'in_progress' | 'verified'

export interface VerificationStep {
  id: string
  label: string
  system: string
  status: 'pending' | 'passed'
  /** Provider-style result detail, filled when the step passes. */
  result?: string
  at?: string
}

export interface UboRecord {
  name: string
  sharePct: number
  /** UBOs each pass their own KYC before the company can complete. */
  verified: boolean
}

export interface VerificationRecord {
  partyId: string
  name: string
  kind: 'individual' | 'company'
  steps: VerificationStep[]
  /** Companies only: beneficial owners resolved from the registry step. */
  ubos?: UboRecord[]
  status: VerificationStatus
  completedOn?: string
}

export function kycStepDefs(): VerificationStep[] {
  return [
    { id: 'document', label: 'Identity document', system: 'Document capture', status: 'pending' },
    { id: 'liveness', label: 'Liveness check', system: 'Identity provider', status: 'pending' },
    { id: 'screening', label: 'Sanctions & PEP screen', system: 'Screening provider', status: 'pending' },
  ]
}

export function kybStepDefs(): VerificationStep[] {
  return [
    { id: 'registry', label: 'Company registry lookup', system: 'Registry (SIREN/KVK/BORME)', status: 'pending' },
    { id: 'ubo', label: 'Beneficial-owner resolution', system: 'UBO register', status: 'pending' },
    { id: 'ubo-kyc', label: 'KYC each beneficial owner', system: 'Identity provider', status: 'pending' },
    { id: 'company-screen', label: 'Company sanctions screen', system: 'Screening provider', status: 'pending' },
  ]
}

export function startRecord(partyId: string, name: string, kind: 'individual' | 'company'): VerificationRecord {
  return {
    partyId,
    name,
    kind,
    steps: kind === 'company' ? kybStepDefs() : kycStepDefs(),
    status: 'in_progress',
  }
}

/** Deterministic UBO structure for an entity — who ultimately owns it. */
export function resolveUbos(entity: Pick<Entity, 'id' | 'name' | 'kind'>): UboRecord[] {
  const rand = keyedRand(entity.id, 'ubo')
  const count = entity.kind === 'individual' ? 1 : 1 + Math.floor(rand() * 3) // 1–3
  const ubos: UboRecord[] = []
  let remaining = 100
  for (let i = 0; i < count; i += 1) {
    const share =
      i === count - 1 ? remaining : Math.max(25, Math.round(remaining * (0.4 + rand() * 0.35)))
    remaining -= share
    ubos.push({
      name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
      sharePct: share,
      verified: false,
    })
  }
  return ubos
}

/** Provider-style result line for a passed step — deterministic per party. */
export function stepResult(partyId: string, stepId: string): string {
  const rand = keyedRand(partyId, stepId, 'result')
  const n = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo))
  switch (stepId) {
    case 'document':
      return `Passport ${'PFRNDE'[n(0, 6)]}${n(1_000_000, 9_999_999)} — MRZ consistent, not expired`
    case 'liveness':
      return `Liveness match ${(96 + rand() * 3.4).toFixed(1)}% — active challenge passed`
    case 'screening':
      return 'No sanctions, PEP or adverse-media match (EU/UN/OFAC lists)'
    case 'registry':
      return `Registered · nº ${n(100, 999)} ${n(100, 999)} ${n(100, 999)} — active, no insolvency record`
    case 'ubo':
      return 'Ownership chain resolved to natural persons (≥25% thresholds applied)'
    case 'ubo-kyc':
      return 'All beneficial owners individually verified'
    case 'company-screen':
      return 'Entity clear — no sanctions or watchlist match'
    default:
      return 'Passed'
  }
}

/**
 * Advance the record by exactly one gate. Real gating: the next pending step
 * only, and the KYB `ubo-kyc` step verifies ONE beneficial owner per call —
 * the step passes only when every UBO has individually passed.
 */
export function advanceRecord(record: VerificationRecord, today: string): VerificationRecord {
  if (record.status === 'verified') return record
  const steps = record.steps.map((s) => ({ ...s }))
  const index = steps.findIndex((s) => s.status === 'pending')
  if (index === -1) return record
  const step = steps[index]
  let ubos = record.ubos ? record.ubos.map((u) => ({ ...u })) : undefined

  if (step.id === 'ubo') {
    ubos = resolveUbos({ id: record.partyId, name: record.name, kind: 'sarl' })
    step.status = 'passed'
    step.result = `${ubos.length} beneficial owner${ubos.length === 1 ? '' : 's'} identified — ${ubos
      .map((u) => `${u.name} ${u.sharePct}%`)
      .join(' · ')}`
    step.at = today
  } else if (step.id === 'ubo-kyc' && ubos) {
    const next = ubos.find((u) => !u.verified)
    if (next) next.verified = true
    if (ubos.every((u) => u.verified)) {
      step.status = 'passed'
      step.result = stepResult(record.partyId, step.id)
      step.at = today
    }
  } else {
    step.status = 'passed'
    step.result = stepResult(record.partyId, step.id)
    step.at = today
  }

  const done = steps.every((s) => s.status === 'passed')
  return {
    ...record,
    steps,
    ubos,
    status: done ? 'verified' : 'in_progress',
    completedOn: done ? today : undefined,
  }
}
