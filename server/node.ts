import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApiRequest, ApiResponse } from './handlers'

/**
 * Node HTTP ↔ framework-free handler adapter. Used verbatim by the Vite dev
 * middleware and the Vercel serverless function, so local and deployed
 * behaviour cannot drift.
 */

export async function readApiRequest(req: IncomingMessage): Promise<ApiRequest> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  // Tolerate both mount styles: Vite's `use('/api', …)` strips the prefix,
  // Vercel's catch-all keeps it.
  const path = url.pathname.replace(/^\/api(\/|$)/, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => (query[key] = value))

  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined

  let body: unknown
  if (req.method === 'POST' || req.method === 'PUT') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    if (raw) {
      try {
        body = JSON.parse(raw)
      } catch {
        body = undefined
      }
    }
  }
  return { method: req.method ?? 'GET', path, query, body, token }
}

export function writeApiResponse(res: ServerResponse, out: ApiResponse): void {
  res.statusCode = out.status
  if (out.contentType) {
    res.setHeader('content-type', out.contentType)
    res.end(typeof out.body === 'string' ? out.body : String(out.body))
  } else {
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(out.body))
  }
}
