import canned from '../fixtures/extracted-lease.json'

/**
 * The ONLY real network call in the app. Anthropic Messages API via fetch,
 * 6-second timeout, and on ANY failure (no key, network down, bad JSON) we
 * fall back silently to the bundled canned extraction so the pitch works
 * fully offline. "Deterministic core, probabilistic edges."
 */

export interface ExtractedLeaseFields {
  parties: string[]
  monthly_rent_excl_charges: number
  charges: number
  deposit_amount: number
  furnished: boolean
  start_date: string
  jurisdiction: string
  indexation_clause: boolean
}

export interface ExtractionResult {
  fields: ExtractedLeaseFields
  confidence: Record<string, number>
  source: 'live' | 'canned'
}

const SYSTEM_PROMPT =
  'Extract lease fields from the document. Respond with JSON only, no prose, shaped as ' +
  '{"fields": {"parties": string[], "monthly_rent_excl_charges": number, "charges": number, ' +
  '"deposit_amount": number, "furnished": boolean, "start_date": "YYYY-MM-DD", ' +
  '"jurisdiction": "FR"|"NL"|"ES"|"DE"|"AT"|"IT", "indexation_clause": boolean}, ' +
  '"confidence": {<field>: number 0..1}}. Amounts are in euros.'

export async function extractLease(text: string): Promise<ExtractionResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_KEY as string | undefined
  if (!apiKey) return cannedResult()

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
        // Required for direct browser calls; fine for a demo, never for production keys.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const raw = data.content?.[0]?.text
    const parsed = JSON.parse(raw)
    if (!parsed?.fields?.monthly_rent_excl_charges) throw new Error('missing fields')
    return {
      fields: parsed.fields,
      confidence: parsed.confidence ?? {},
      source: 'live',
    }
  } catch {
    return cannedResult()
  } finally {
    clearTimeout(timer)
  }
}

function cannedResult(): ExtractionResult {
  return {
    fields: canned.fields as ExtractedLeaseFields,
    confidence: canned.confidence,
    source: 'canned',
  }
}
