import { create } from 'zustand'
import { DemoWorld, WorldSnapshot } from '../engine/world'
import { buildPersona, DEFAULT_PERSONA_ID } from '../engine/seed/personas'
import { Role } from '../engine/seed/types'

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
  | 'lenderpack'

const STORAGE_KEY = 'keystone-demo-v1'

function loadWorld(): { world: DemoWorld; personaId: string; hadSnapshot: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const snapshot = JSON.parse(raw) as WorldSnapshot
      const persona = buildPersona(snapshot.personaId)
      return {
        world: new DemoWorld(persona, snapshot),
        personaId: snapshot.personaId,
        hadSnapshot: true,
      }
    }
  } catch {
    // Corrupt or stale snapshot → fall through to a fresh seed.
  }
  return {
    world: new DemoWorld(buildPersona(DEFAULT_PERSONA_ID)),
    personaId: DEFAULT_PERSONA_ID,
    hadSnapshot: false,
  }
}

function persist(world: DemoWorld): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world.snapshot()))
  } catch {
    // localStorage unavailable or full — demo still works, just no refresh-survival.
  }
}

/** WhiteLabelTheme: persona themeOverride swaps the accent CSS var. */
export function applyTheme(world: DemoWorld, whiteLabel: boolean): void {
  const override = world.state.persona.themeOverride
  const root = document.documentElement
  if (override && whiteLabel) {
    root.style.setProperty('--brass', override.brand)
  } else {
    root.style.removeProperty('--brass')
  }
}

export function defaultScreen(role: Role): Screen {
  if (role === 'partner') return 'partner'
  if (role === 'property_manager') return 'rollup'
  return 'dashboard'
}

interface AppState {
  world: DemoWorld
  personaId: string
  /** Bumped after every mutation — components subscribe to this to re-render. */
  rev: number
  screen: Screen
  /** ?demo=clean hides the dev badges + demo panel for the actual pitch. */
  demoClean: boolean
  /** First load with no saved state → show the login-style persona picker. */
  needsPicker: boolean
  /** WhiteLabelTheme toggle (personas with themeOverride). */
  whiteLabel: boolean
  setScreen(screen: Screen): void
  /** Run a mutation against the world, persist, re-render. */
  mutate(fn: (world: DemoWorld) => void): void
  switchPersona(personaId: string): void
  setWhiteLabel(on: boolean): void
  resetSeed(): void
}

const initial = loadWorld()
applyTheme(initial.world, true)

export const useApp = create<AppState>((set, get) => ({
  world: initial.world,
  personaId: initial.personaId,
  rev: 0,
  screen: defaultScreen(initial.world.state.persona.role),
  demoClean: new URLSearchParams(window.location.search).get('demo') === 'clean',
  needsPicker: !initial.hadSnapshot,
  whiteLabel: true,

  setScreen: (screen) => set({ screen }),

  mutate: (fn) => {
    const { world, rev } = get()
    fn(world)
    persist(world)
    set({ rev: rev + 1 })
  },

  switchPersona: (personaId) => {
    // Reset journal → load persona seed → set role → apply theme.
    const world = new DemoWorld(buildPersona(personaId))
    persist(world)
    applyTheme(world, get().whiteLabel)
    set({
      world,
      personaId,
      rev: get().rev + 1,
      screen: defaultScreen(world.state.persona.role),
      needsPicker: false,
    })
  },

  setWhiteLabel: (on) => {
    applyTheme(get().world, on)
    set({ whiteLabel: on, rev: get().rev + 1 })
  },

  resetSeed: () => {
    const { personaId } = get()
    const world = new DemoWorld(buildPersona(personaId))
    persist(world)
    set({ world, rev: get().rev + 1, screen: defaultScreen(world.state.persona.role) })
  },
}))
