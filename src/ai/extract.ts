import canned from '../fixtures/extracted-lease.json'
import { extractViaApi } from '../api/client'

/**
 * Lease extraction, client side (Addendum D §4.1). The browser never talks
 * to Anthropic and never holds a key: it POSTs the document to our
 * /api/extract serverless function, which holds ANTHROPIC_API_KEY
 * server-side. Any failure — API unreachable, no key configured, timeout —
 * falls back silently to the bundled canned extraction so the pitch works
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

export async function extractLease(text: string): Promise<ExtractionResult> {
  const viaApi = await extractViaApi(text)
  if (viaApi) {
    return {
      fields: viaApi.fields as unknown as ExtractedLeaseFields,
      confidence: viaApi.confidence,
      source: viaApi.source,
    }
  }
  return cannedResult()
}

function cannedResult(): ExtractionResult {
  return {
    fields: canned.fields as ExtractedLeaseFields,
    confidence: canned.confidence,
    source: 'canned',
  }
}
