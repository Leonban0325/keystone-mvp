import { create } from 'zustand'
import { DemoWorld, WorldSnapshot } from '../engine/world'
import { buildPersona, DEFAULT_PERSONA_ID } from '../engine/seed/personas'
import { Role } from '../engine/seed/types'
import { DataSource, fetchWorld, pushEvents, resetServer } from '../api/client'
import { JournalEvent } from '../engine/ledger/types'

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

/** Cmd-K deep-link payload, consumed (and cleared) by the target screen. */
export interface Focus {
  leaseId?: string
  propertyId?: string
  entityId?: string
}

interface AppState {
  world: DemoWorld
  personaId: string
  /**
   * 'api'   — world was loaded from the persisted curated dataset; mutations
   *           are POSTed back and validated server-side (Addendum D).
   * 'local' — back-end unreachable (static hosting / network off on stage):
   *           the deterministic generator runs in-browser. Same numbers.
   */
  dataSource: DataSource
  /** Server journal length this world was loaded at — optimistic concurrency. */
  baseSeq: number
  focus: Focus | null
  setFocus(focus: Focus | null): void
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
  /** Run a mutation against the world, persist, push to the API, re-render. */
  mutate(fn: (world: DemoWorld) => void): void
  switchPersona(personaId: string): void
  setWhiteLabel(on: boolean): void
  resetSeed(): void
  /** Try to replace the in-memory world with the server's persisted dataset. */
  hydrate(): Promise<void>
}

const initial = loadWorld()
applyTheme(initial.world, true)

/** Serialise pushes so concurrent mutations can't race on baseSeq. */
let pushChain: Promise<void> = Promise.resolve()

export const useApp = create<AppState>((set, get) => {
  async function hydrateFromApi(personaId: string): Promise<void> {
    const result = await fetchWorld(personaId)
    if (get().personaId !== personaId) return // user switched persona meanwhile
    if (!result) {
      set({ dataSource: 'local' })
      return
    }
    applyTheme(result.world, get().whiteLabel)
    persist(result.world)
    set({
      world: result.world,
      baseSeq: result.baseSeq,
      dataSource: 'api',
      rev: get().rev + 1,
    })
  }

  function schedulePush(): void {
    pushChain = pushChain.then(async () => {
      const { world, personaId, baseSeq, dataSource } = get()
      if (dataSource !== 'api') return
      const events = world.journal.all.slice(baseSeq) as JournalEvent[]
      const { events: _omit, ...state } = world.snapshot()
      const result = await pushEvents(personaId, baseSeq, events, state)
      if (get().personaId !== personaId) return
      if (result === 'conflict') {
        // Another writer moved the journal — the server dataset wins.
        await hydrateFromApi(personaId)
      } else if (result) {
        set({ baseSeq: result.seq })
      } else {
        set({ dataSource: 'local' }) // API gone — keep working locally.
      }
    })
  }

  return {
    world: initial.world,
    personaId: initial.personaId,
    dataSource: 'local',
    baseSeq: 0,
    rev: 0,
    screen: defaultScreen(initial.world.state.persona.role),
    demoClean: new URLSearchParams(window.location.search).get('demo') === 'clean',
    needsPicker: !initial.hadSnapshot,
    whiteLabel: true,

    focus: null,
    setFocus: (focus) => set({ focus }),

    setScreen: (screen) => set({ screen }),

    mutate: (fn) => {
      const { world, rev } = get()
      fn(world)
      persist(world)
      set({ rev: rev + 1 })
      schedulePush()
    },

    switchPersona: (personaId) => {
      // Reset journal → load persona seed → set role → apply theme.
      const world = new DemoWorld(buildPersona(personaId))
      persist(world)
      applyTheme(world, get().whiteLabel)
      set({
        world,
        personaId,
        dataSource: 'local',
        baseSeq: 0,
        rev: get().rev + 1,
        screen: defaultScreen(world.state.persona.role),
        needsPicker: false,
      })
      void hydrateFromApi(personaId)
    },

    setWhiteLabel: (on) => {
      applyTheme(get().world, on)
      set({ whiteLabel: on, rev: get().rev + 1 })
    },

    resetSeed: () => {
      const { personaId } = get()
      const world = new DemoWorld(buildPersona(personaId))
      persist(world)
      set({
        world,
        dataSource: 'local',
        baseSeq: 0,
        rev: get().rev + 1,
        screen: defaultScreen(world.state.persona.role),
      })
      // Regenerate the persisted dataset too, then reload from it.
      void resetServer(personaId).then((ok) => {
        if (ok) void hydrateFromApi(personaId)
      })
    },

    hydrate: () => hydrateFromApi(get().personaId),
  }
})

// Boot: paint instantly from the local seed/snapshot, then swap in the
// persisted server dataset when the API answers. Offline → stays local.
void useApp.getState().hydrate()
