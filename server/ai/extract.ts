import canned from '../../src/fixtures/extracted-lease.json'
import type { ApiResponse } from '../handlers'

/**
 * §4.1 document extraction — the one genuine production use of AI.
 * The Anthropic key lives HERE, server-side, read from a non-VITE env var.
 * It never reaches the browser. Any failure (no key, timeout, bad JSON)
 * falls back invisibly to the canned fixture.
 */

const SYSTEM_PROMPT =
  'Extract lease fields from the document. Respond with JSON only, no prose, shaped as ' +
  '{"fields": {"parties": string[], "monthly_rent_excl_charges": number, "charges": number, ' +
  '"deposit_amount": number, "furnished": boolean, "start_date": "YYYY-MM-DD", ' +
  '"jurisdiction": "FR"|"NL"|"ES"|"DE"|"AT"|"IT", "indexation_clause": boolean}, ' +
  '"confidence": {<field>: number 0..1}}. Amounts are in euros.'

export async function extractHandler(body: { text?: string } | undefined): Promise<ApiResponse> {
  const text = body?.text
  if (!text || text.length < 40) {
    return { status: 400, body: { error: 'text required (the lease document)' } }
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { status: 200, body: { ...canned, source: 'canned' } }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text.slice(0, 20_000) }],
      }),
    })
    if (!response.ok) throw new Error(`anthropic ${response.status}`)
    const data = (await response.json()) as { content?: { text?: string }[] }
    const parsed = JSON.parse(data.content?.[0]?.text ?? '')
    if (!parsed?.fields?.monthly_rent_excl_charges) throw new Error('missing fields')
    return {
      status: 200,
      body: { fields: parsed.fields, confidence: parsed.confidence ?? {}, source: 'live' },
    }
  } catch {
    return { status: 200, body: { ...canned, source: 'canned' } }
  } finally {
    clearTimeout(timer)
  }
}
