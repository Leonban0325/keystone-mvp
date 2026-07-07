import { getDb } from './db'
import {
  appendEvents,
  ensureSeeded,
  loadDataset,
  seedAll,
  seedPersona,
  worldFor,
} from './store'
import { moneyRollup, RollupLevel, complianceTrackRecord } from '../src/engine/analytics'
import { engineStatus } from '../src/engine/savings/detectors'
import { personaIds } from '../src/engine/seed/personas'
import { extractHandler } from './ai/extract'
import { queryHandler } from './ai/query'

/**
 * Back-end API (Addendum D §3): real services over the persisted curated
 * data. Framework-free handlers — wrapped by the Vite dev middleware locally
 * and by a Vercel serverless function when deployed.
 */

export interface ApiRequest {
  method: string
  path: string // after /api/
  query: Record<string, string>
  body?: unknown
}

export interface ApiResponse {
  status: number
  body: unknown
  contentType?: string
}

const json = (body: unknown, status = 200): ApiResponse => ({ status, body })
const error = (status: number, message: string): ApiResponse => ({ status, body: { error: message } })

export const ENDPOINTS = [
  'GET  /api/health',
  'GET  /api/dataset?persona=…            — persona metadata + persisted 12-month journal + state',
  'GET  /api/portfolio?persona=…          — dashboard folds, computed server-side',
  'GET  /api/compliance?persona=…         — findings from the versioned rulesets + track record',
  'GET  /api/savings?persona=…            — detector queue with logic trails + engine status',
  'GET  /api/rollup?persona=…&level=owner — journal folded by dimension',
  'GET  /api/documents/fec?persona=…      — FEC-style export straight from the ledger',
  'POST /api/events                        — append events; invariants enforced server-side',
  'POST /api/admin/reset                   — regenerate the curated dataset (idempotent seed)',
  'POST /api/extract                       — AI lease extraction (key server-side, canned fallback)',
  'POST /api/query                         — natural-language portfolio query (canned fallback)',
  'GET  /api/system?persona=…             — open the hood: counts, rulesets, recent events',
]

export async function route(req: ApiRequest): Promise<ApiResponse> {
  const db = await getDb()
  const persona = req.query.persona ?? (req.body as { personaId?: string } | undefined)?.personaId

  switch (`${req.method} ${req.path}`) {
    case 'GET health': {
      await ensureSeeded(db)
      return json({
        ok: true,
        storage: process.env.DATABASE_URL ? 'postgres' : 'pglite',
        personas: personaIds(),
      })
    }

    case 'GET dataset': {
      if (!persona) return error(400, 'persona required')
      await ensureSeeded(db)
      const dataset = await loadDataset(db, persona)
      if (!dataset) return error(404, `unknown persona ${persona}`)
      return json(dataset)
    }

    case 'GET portfolio': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      return json({ dashboard: world.dashboard(), today: world.today })
    }

    case 'GET compliance': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      return json({ findings: world.findings(), trackRecord: complianceTrackRecord(world) })
    }

    case 'GET savings': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      const opportunities = world.savingsOpportunities()
      return json({ opportunities, status: engineStatus(opportunities, world.state.leases.length) })
    }

    case 'GET rollup': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      const level = (req.query.level ?? 'portfolio') as RollupLevel
      return json({ rows: moneyRollup(world, level, req.query.parent || undefined) })
    }

    case 'GET documents/fec': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      const rows = [
        'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|Debit|Credit|EcritureLib',
      ]
      world.journal.all.forEach((event, i) => {
        for (const p of event.postings) {
          rows.push(
            [
              'KEY',
              'Journal Keystone',
              String(i + 1),
              event.date.replace(/-/g, ''),
              p.account,
              p.direction === 'debit' ? (p.amountCents / 100).toFixed(2) : '0.00',
              p.direction === 'credit' ? (p.amountCents / 100).toFixed(2) : '0.00',
              (event.memo ?? event.kind).replace(/[|\n]/g, ' '),
            ].join('|'),
          )
        }
      })
      return { status: 200, body: rows.join('\n'), contentType: 'text/csv; charset=utf-8' }
    }

    case 'POST events': {
      const body = req.body as {
        personaId: string
        baseSeq: number
        events: never[]
        state: never
      }
      if (!body?.personaId) return error(400, 'personaId required')
      await ensureSeeded(db)
      try {
        const result = await appendEvents(db, body.personaId, body.baseSeq, body.events, body.state)
        if ('conflict' in result) {
          return json({ conflict: true, seq: result.conflict }, 409)
        }
        return json({ ok: true, seq: result.seq })
      } catch (e) {
        // Invariant violation — the ledger said no.
        return error(422, e instanceof Error ? e.message : 'rejected')
      }
    }

    case 'POST admin/reset': {
      await ensureSeeded(db)
      if (persona) {
        const result = await seedPersona(db, persona)
        return json({ ok: true, reseeded: { [persona]: result.events } })
      }
      return json({ ok: true, reseeded: await seedAll(db) })
    }

    case 'POST extract':
      return extractHandler(req.body as { text?: string })

    case 'POST query': {
      const world = await requireWorld(db, persona)
      if (!world) return error(404, 'unknown persona')
      return queryHandler(world, (req.body as { question?: string })?.question ?? '')
    }

    case 'GET system': {
      await ensureSeeded(db)
      const world = persona ? await worldFor(db, persona) : null
      const counts = await db.query(
        'select persona_id, count(*)::int as events from journal_events group by persona_id order by persona_id',
      )
      const rulesets = await db.query('select jurisdiction, version from rulesets order by jurisdiction')
      return json({
        endpoints: ENDPOINTS,
        storage: process.env.DATABASE_URL ? 'postgres' : 'pglite (embedded Postgres)',
        aiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
        journalCounts: counts.rows,
        rulesets: rulesets.rows,
        recentEvents: world ? world.journal.all.slice(-12) : [],
      })
    }

    default:
      return error(404, `no route: ${req.method} /api/${req.path}`)
  }
}

async function requireWorld(db: Awaited<ReturnType<typeof getDb>>, persona?: string) {
  if (!persona) return null
  await ensureSeeded(db)
  return worldFor(db, persona)
}
