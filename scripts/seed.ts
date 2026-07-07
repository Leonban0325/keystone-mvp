import { createDb } from '../server/db'
import { seedAll } from '../server/store'
import { personaIds } from '../src/engine/seed/personas'

/**
 * Curated-dataset seed (Addendum D §2): runs the deterministic generator
 * ONCE, persists each persona's 12-month journal + state + rulesets to the
 * database, then exits. Idempotent — wipes and regenerates per persona.
 *
 *   npm run seed                → PGlite file at .data/keystone-pglite
 *   DATABASE_URL=… npm run seed → hosted Postgres (Neon / Supabase / Vercel)
 */

const started = Date.now()
const db = await createDb()
console.log(
  `Seeding ${personaIds().length} personas into ${process.env.DATABASE_URL ? 'Postgres (DATABASE_URL)' : 'PGlite (embedded, file-backed)'}…`,
)

const counts = await seedAll(db)
for (const [id, events] of Object.entries(counts)) {
  console.log(`  ${id.padEnd(14)} ${String(events).padStart(6)} journal events`)
}
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`)
process.exit(0)
