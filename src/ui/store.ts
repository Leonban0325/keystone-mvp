import { create } from 'zustand'
import { DemoWorld, WorldSnapshot } from '../engine/world'
import { buildPersona, DEFAULT_PERSONA_ID } from '../engine/seed/personas'
import { Role } from '../engine/seed/types'
import { DataSource, fetchWorld, loginViaApi, pushEvents, resetServer } from '../api/client'
import { JournalEvent } from '../engine/ledger/types'
import { findCredential, mintToken } from '../access/credentials'
import { allowedScreens, defaultScreen } from './rbac'
import { clearStoredSession, getStoredSession, Session, storeSession } from './session'

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
  | 'rails'
  | 'system'

export { defaultScreen } from './rbac'

/** Public marketing routes + the gated app (Addendum F §4). */
export type Route = 'home' | 'firm' | 'services' | 'insight' | 'pitch' | 'contact' | 'access' | 'app'

const ROUTE_PATHS: Record<Route, string> = {
  home: '/',
  firm: '/firm',
  services: '/services',
  insight: '/insight',
  pitch: '/pitch',
  contact: '/contact',
  access: '/access',
  app: '/app',
}

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith('/app')) return 'app'
  const found = (Object.entries(ROUTE_PATHS) as [Route, string][]).find(
    ([, path]) => path !== '/' && pathname.startsWith(path),
  )
  return found?.[0] ?? 'home'
}

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

/** Cmd-K deep-link payload, consumed (and cleared) by the target screen. */
export interface Focus {
  leaseId?: string
  propertyId?: string
  entityId?: string
  /** Money → Rails click-through: land pre-focused on this journal event. */
  eventId?: string
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
  /** WhiteLabelTheme toggle (personas with themeOverride). */
  whiteLabel: boolean
  /** Addendum F: the front door. No session → landing; login gates /app. */
  route: Route
  session: Session | null
  navigate(route: Route): void
  login(email: string, password: string): Promise<string | null>
  logout(): void
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
const initialSession = getStoredSession()
const demoCleanBoot = new URLSearchParams(window.location.search).get('demo') === 'clean'

// §4 reset behaviour: fresh load with no session lands PUBLIC — on the
// landing Home, or on /access if the URL pointed into the app. ?demo=clean
// auto-skips the landing (rapid stage switching) by minting the default
// persona's session.
let bootSession = initialSession
if (!bootSession && demoCleanBoot) {
  bootSession = {
    personaId: initial.personaId,
    role: initial.world.state.persona.role,
    token: mintToken(initial.personaId),
  }
  storeSession(bootSession)
}
let bootRoute = routeFromPath(window.location.pathname)
if (bootRoute === 'app' && !bootSession) bootRoute = 'access'
if (demoCleanBoot && bootSession) bootRoute = 'app'
window.history.replaceState(null, '', ROUTE_PATHS[bootRoute] + window.location.search)

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

  /** Load a persona's world and enter the app under its role. */
  function enterAs(personaId: string, session: Session): void {
    const world = new DemoWorld(buildPersona(personaId))
    persist(world)
    storeSession(session)
    applyTheme(world, get().whiteLabel)
    window.scrollTo(0, 0)
    set({
      world,
      personaId,
      session,
      dataSource: 'local',
      baseSeq: 0,
      rev: get().rev + 1,
      screen: defaultScreen(world.state.persona.role),
      focus: null,
    })
    void hydrateFromApi(personaId)
  }

  return {
    world: initial.world,
    personaId: initial.personaId,
    dataSource: 'local',
    baseSeq: 0,
    rev: 0,
    screen: defaultScreen(initial.world.state.persona.role),
    demoClean: demoCleanBoot,
    whiteLabel: true,
    route: bootRoute,
    session: bootSession,

    focus: null,
    setFocus: (focus) => set({ focus }),

    navigate: (route) => {
      // §4 guard: the app is gated; everything else is public.
      const target = route === 'app' && !get().session ? 'access' : route
      window.history.pushState(null, '', ROUTE_PATHS[target] + window.location.search)
      window.scrollTo(0, 0)
      set({ route: target })
    },

    /** §2: demo sign-in. Server session when the API is up, local otherwise. */
    login: async (email, password) => {
      const viaApi = await loginViaApi(email, password)
      const credential = viaApi ?? findCredential(email, password)
      if (!credential) return 'Unknown credentials — use one of the sign-ins listed below.'
      const session: Session = {
        personaId: credential.personaId,
        role: credential.role,
        token: 'token' in credential ? credential.token : mintToken(credential.personaId),
        email,
      }
      enterAs(credential.personaId, session)
      get().navigate('app')
      return null
    },

    /** §2.3: logout returns to the landing Home; datasets persist untouched. */
    logout: () => {
      clearStoredSession()
      set({ session: null })
      get().navigate('home')
    },

    setScreen: (screen) => {
      // §3 RBAC: an unauthorized screen lands on the role's own home.
      const { session, world, demoClean } = get()
      const role: Role = session?.role ?? world.state.persona.role
      const allowed = allowedScreens(role, demoClean)
      window.scrollTo(0, 0)
      set({ screen: allowed.has(screen) ? screen : defaultScreen(role) })
    },

    mutate: (fn) => {
      const { world, rev } = get()
      fn(world)
      persist(world)
      set({ rev: rev + 1 })
      schedulePush()
    },

    /** Demo-panel quick switch (stage use) — re-scopes the session too. */
    switchPersona: (personaId) => {
      const persona = buildPersona(personaId)
      enterAs(personaId, {
        personaId,
        role: persona.role,
        token: mintToken(personaId),
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

// Browser back/forward moves between landing sections and the app.
window.addEventListener('popstate', () => {
  const route = routeFromPath(window.location.pathname)
  useApp.setState({ route: route === 'app' && !useApp.getState().session ? 'access' : route })
})

// Boot: paint instantly from the local seed/snapshot, then swap in the
// persisted server dataset when the API answers. Offline → stays local.
if (bootSession) void useApp.getState().hydrate()
