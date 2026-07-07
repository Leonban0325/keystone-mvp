/**
 * Database adapter (Addendum D §1/§5).
 *
 * - `DATABASE_URL` set → hosted Postgres (Neon / Supabase / Vercel Postgres)
 *   through node-postgres. This is the deployed posture.
 * - otherwise → PGlite, a real Postgres running embedded (WASM) with file
 *   persistence. Zero accounts, zero network: `npm run dev` and the seed
 *   script work anywhere, including fully offline on stage.
 *
 * Same SQL either way — the seed written locally replays identically on Neon.
 */

export interface Db {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
  exec(sql: string): Promise<void>
}

function pgliteDataDir(): string {
  if (process.env.KEYSTONE_DATA_DIR) return process.env.KEYSTONE_DATA_DIR
  // Vercel's serverless filesystem is read-only except /tmp — an ephemeral
  // dataset that lazily reseeds per cold start (fine for a shared demo link).
  if (process.env.VERCEL) return '/tmp/keystone-pglite'
  return '.data/keystone-pglite'
}

export async function createDb(options?: { memory?: boolean }): Promise<Db> {
  if (!options?.memory && process.env.DATABASE_URL) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
    return {
      query: (sql, params) => pool.query(sql, params as never[]),
      exec: async (sql) => {
        await pool.query(sql)
      },
    }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  let pglite
  if (options?.memory) {
    pglite = new PGlite()
  } else {
    const dir = pgliteDataDir()
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true }) // PGlite won't create parent dirs
    pglite = new PGlite(dir)
  }
  return {
    query: async (sql, params) => {
      const result = await pglite.query(sql, params as never[])
      return { rows: result.rows as Record<string, unknown>[] }
    },
    exec: async (sql) => {
      await pglite.exec(sql)
    },
  }
}

// Stashed on globalThis so Vite dev-server module reloads (ssrLoadModule
// invalidation) reuse the open handle instead of re-opening the PGlite dir.
const g = globalThis as typeof globalThis & { __keystoneDb?: Promise<Db> }

export function getDb(): Promise<Db> {
  if (!g.__keystoneDb) g.__keystoneDb = createDb()
  return g.__keystoneDb
}

export const SCHEMA = `
create table if not exists personas (
  id text primary key,
  data jsonb not null,
  seeded_at timestamptz not null default now()
);
create table if not exists journal_events (
  persona_id text not null,
  seq int not null,
  id text not null,
  date text not null,
  kind text not null,
  data jsonb not null,
  primary key (persona_id, seq)
);
create index if not exists journal_events_by_kind on journal_events (persona_id, kind);
create table if not exists world_state (
  persona_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists rulesets (
  jurisdiction text primary key,
  version text not null,
  data jsonb not null
);
`
