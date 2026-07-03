import { PersonaSeed } from '../types'
import { buildA1Meridian } from './a1-meridian'

/** Persona registry. Builders run fresh per call so switching resets state. */
const BUILDERS: Record<string, () => PersonaSeed> = {
  'a1-meridian': buildA1Meridian,
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
