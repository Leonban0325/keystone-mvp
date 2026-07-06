import { PersonaSeed } from '../types'
import { buildA1Meridian } from './a1-meridian'
import {
  buildA2Sofia,
  buildA3Falkenrath,
  buildB1Haussmann,
  buildB2Rijnland,
  buildB3Ibervia,
  buildC1Rentora,
  buildC2Hexagone,
  buildC3PartnerBank,
} from './catalog'

/** Persona registry. Builders run fresh per call so switching resets state. */
const BUILDERS: Record<string, () => PersonaSeed> = {
  'a1-meridian': buildA1Meridian,
  'a2-sofia': buildA2Sofia,
  'a3-falkenrath': buildA3Falkenrath,
  'b1-haussmann': buildB1Haussmann,
  'b2-rijnland': buildB2Rijnland,
  'b3-ibervia': buildB3Ibervia,
  'c1-rentora': buildC1Rentora,
  'c2-hexagone': buildC2Hexagone,
  'c3-partnerbank': buildC3PartnerBank,
}

export const DEFAULT_PERSONA_ID = 'a1-meridian'

export function buildPersona(id: string): PersonaSeed {
  const builder = BUILDERS[id]
  if (!builder) throw new Error(`Unknown persona: ${id}`)
  return builder()
}

export function personaIds(): string[] {
  return Object.keys(BUILDERS)
}
