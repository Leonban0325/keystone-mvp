import { create } from 'zustand'
import { DemoWorld, WorldSnapshot } from '../engine/world'
import { buildPersona, DEFAULT_PERSONA_ID } from '../engine/seed/personas'

export type Screen =
  | 'dashboard'
  | 'leases'
  | 'compliance'
  | 'money'
  | 'card'
  | 'savings'
  | 'reports'
  | 'partner'
  | 'rollup'

const STORAGE_KEY = 'keystone-demo-v1'

function loadWorld(): { world: DemoWorld; personaId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const snapshot = JSON.parse(raw) as WorldSnapshot
      const persona = buildPersona(snapshot.personaId)
      return { world: new DemoWorld(persona, snapshot), personaId: snapshot.personaId }
    }
  } catch {
    // Corrupt or stale snapshot → fall through to a fresh seed.
  }
  return { world: new DemoWorld(buildPersona(DEFAULT_PERSONA_ID)), personaId: DEFAULT_PERSONA_ID }
}

function persist(world: DemoWorld): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world.snapshot()))
  } catch {
    // localStorage unavailable (private mode) — demo still works, just no refresh-survival.
  }
}

interface AppState {
  world: DemoWorld
  personaId: string
  /** Bumped after every mutation — components subscribe to this to re-render. */
  rev: number
  screen: Screen
  /** ?demo=clean hides the dev badges + demo panel for the actual pitch. */
  demoClean: boolean
  setScreen(screen: Screen): void
  /** Run a mutation against the world, persist, re-render. */
  mutate(fn: (world: DemoWorld) => void): void
  switchPersona(personaId: string): void
  resetSeed(): void
}

const initial = loadWorld()

export const useApp = create<AppState>((set, get) => ({
  world: initial.world,
  personaId: initial.personaId,
  rev: 0,
  screen: 'dashboard',
  demoClean: new URLSearchParams(window.location.search).get('demo') === 'clean',

  setScreen: (screen) => set({ screen }),

  mutate: (fn) => {
    const { world, rev } = get()
    fn(world)
    persist(world)
    set({ rev: rev + 1 })
  },

  switchPersona: (personaId) => {
    // Reset journal → load persona seed → set role/theme (read from persona by the UI).
    const world = new DemoWorld(buildPersona(personaId))
    persist(world)
    set({ world, personaId, rev: get().rev + 1, screen: 'dashboard' })
  },

  resetSeed: () => {
    const { personaId } = get()
    const world = new DemoWorld(buildPersona(personaId))
    persist(world)
    set({ world, rev: get().rev + 1 })
  },
}))
