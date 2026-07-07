import type { IncomingMessage, ServerResponse } from 'node:http'
import { route } from '../server/handlers'
import { readApiRequest, writeApiResponse } from '../server/node'

/**
 * Vercel serverless catch-all: every /api/* request lands here and goes
 * through the same framework-free router the Vite dev middleware uses.
 * Env (server-side only, never VITE_-prefixed): ANTHROPIC_API_KEY,
 * DATABASE_URL. Without DATABASE_URL the function falls back to PGlite in
 * /tmp — ephemeral, lazily reseeded per cold start, fine for a demo link.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    writeApiResponse(res, await route(await readApiRequest(req)))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'server error' }))
  }
}
