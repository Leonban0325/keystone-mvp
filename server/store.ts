import { Db, SCHEMA } from './db'
import { DemoWorld, WorldSnapshot } from '../src/engine/world'
import { Journal } from '../src/engine/ledger/journal'
import { JournalEvent } from '../src/engine/ledger/types'
import { buildPersona, personaIds } from '../src/engine/seed/personas'
import { PersonaSeed } from '../src/engine/seed/types'
import { RULESETS } from '../src/engine/compliance/rulesets'

/**
 * Persistence for the curated datasets: the generator runs once (seed-time),
 * writes each persona's 12-month journal; afterwards everything reads or
 * appends — the front-end queries, it never generates.
 */

export interface Dataset {
  persona: PersonaSeed
  state: Omit<WorldSnapshot, 'events'>
  events: JournalEvent[]
}

export async function ensureSchema(db: Db): Promise<void> {
  await db.exec(SCHEMA)
}

export async function isSeeded(db: Db): Promise<boolean> {
  try {
    const { rows } = await db.query('select count(*)::int as n from personas')
    return Number(rows[0]?.n ?? 0) >= personaIds().length
  } catch {
    return false
  }
}

/** Idempotent: wipes and regenerates one persona's dataset deterministically. */
export async function seedPersona(db: Db, personaId: string): Promise<{ events: number }> {
  const world = new DemoWorld(buildPersona(personaId))
  const snapshot = world.snapshot()
  const persona = { ...world.state.persona, events: [] }
  const state = { ...snapshot, events: [] as JournalEvent[] }

  await db.query('delete from journal_events where persona_id = $1', [personaId])
  await db.query('delete from world_state where persona_id = $1', [personaId])
  await db.query('delete from personas where id = $1', [personaId])
  await db.query('insert into personas (id, data) values ($1, $2)', [
    personaId,
    JSON.stringify(persona),
  ])
  await insertEvents(db, personaId, snapshot.events, 0)
  await db.query('insert into world_state (persona_id, data) values ($1, $2)', [
    personaId,
    JSON.stringify(state),
  ])
  return { events: snapshot.events.length }
}

export async function seedAll(db: Db): Promise<Record<string, number>> {
  await ensureSchema(db)
  const out: Record<string, number> = {}
  for (const id of personaIds()) {
    out[id] = (await seedPersona(db, id)).events
  }
  for (const [jurisdiction, ruleset] of RULESETS) {
    await db.query(
      `insert into rulesets (jurisdiction, version, data) values ($1, $2, $3)
       on conflict (jurisdiction) do update set version = $2, data = $3`,
      [jurisdiction, ruleset.version, JSON.stringify(ruleset)],
    )
  }
  return out
}

/** Lazy bootstrap: first request on a fresh database seeds it. */
export async function ensureSeeded(db: Db): Promise<void> {
  await ensureSchema(db)
  if (!(await isSeeded(db))) await seedAll(db)
}

async function insertEvents(
  db: Db,
  personaId: string,
  events: readonly JournalEvent[],
  startSeq: number,
): Promise<void> {
  const CHUNK = 400
  for (let offset = 0; offset < events.length; offset += CHUNK) {
    const chunk = events.slice(offset, offset + CHUNK)
    const values: string[] = []
    const params: unknown[] = []
    chunk.forEach((event, i) => {
      const base = i * 6
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`)
      params.push(
        personaId,
        startSeq + offset + i,
        event.id,
        event.date,
        event.kind,
        JSON.stringify(event),
      )
    })
    await db.query(
      `insert into journal_events (persona_id, seq, id, date, kind, data) values ${values.join(',')}`,
      params,
    )
  }
}

export async function loadDataset(db: Db, personaId: string): Promise<Dataset | null> {
  const personaRows = await db.query('select data from personas where id = $1', [personaId])
  if (personaRows.rows.length === 0) return null
  const stateRows = await db.query('select data from world_state where persona_id = $1', [
    personaId,
  ])
  const eventRows = await db.query(
    'select data from journal_events where persona_id = $1 order by seq',
    [personaId],
  )
  return {
    persona: personaRows.rows[0].data as PersonaSeed,
    state: stateRows.rows[0]?.data as Omit<WorldSnapshot, 'events'>,
    events: eventRows.rows.map((r) => r.data as JournalEvent),
  }
}

/** Rebuild the server-side world from persisted rows (read/replay). */
export async function worldFor(db: Db, personaId: string): Promise<DemoWorld | null> {
  const dataset = await loadDataset(db, personaId)
  if (!dataset) return null
  return new DemoWorld(
    { ...dataset.persona, events: [] },
    { ...dataset.state, events: dataset.events },
  )
}

/**
 * Append client-proposed events. The server replays them through its own
 * Journal first — the invariants are enforced HERE, not trusted from the
 * browser. Optimistic concurrency via baseSeq.
 */
export async function appendEvents(
  db: Db,
  personaId: string,
  baseSeq: number,
  newEvents: JournalEvent[],
  state: Omit<WorldSnapshot, 'events'>,
): Promise<{ seq: number } | { conflict: number }> {
  const countRows = await db.query(
    'select count(*)::int as n from journal_events where persona_id = $1',
    [personaId],
  )
  const stored = Number(countRows.rows[0]?.n ?? 0)
  if (stored !== baseSeq) return { conflict: stored }

  if (newEvents.length > 0) {
    const eventRows = await db.query(
      'select data from journal_events where persona_id = $1 order by seq',
      [personaId],
    )
    const journal = Journal.fromEvents(eventRows.rows.map((r) => r.data as JournalEvent))
    for (const event of newEvents) journal.append(event) // throws on invariant violation
    await insertEvents(db, personaId, newEvents, stored)
  }
  await db.query(
    `insert into world_state (persona_id, data, updated_at) values ($1, $2, now())
     on conflict (persona_id) do update set data = $2, updated_at = now()`,
    [personaId, JSON.stringify({ ...state, events: [] })],
  )
  return { seq: stored + newEvents.length }
}
