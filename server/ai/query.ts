import type { DemoWorld } from '../../src/engine/world'
import { cannedParse, PortfolioQuery, runQuery } from '../../src/engine/queryDsl'
import type { ApiResponse } from '../handlers'

/**
 * §4.2 natural-language portfolio query. The AI translates the question into
 * the structured PortfolioQuery DSL — read-only, over curated data — and
 * plain code executes it. Without a key (or on any failure) the canned
 * matcher answers the seeded questions.
 */

const SYSTEM_PROMPT = `You translate property-portfolio questions into a JSON query. Respond with JSON only:
{"where": {"jurisdiction"?: "FR"|"NL"|"ES"|"DE", "city"?: string, "ownerName"?: string, "tenantName"?: string, "depositOverCap"?: boolean, "arrearsOverDays"?: number, "inDunning"?: boolean, "movingOutWithinDays"?: number}, "select": "leases"|"count"|"arrears_total"}
Only include filters the question asks for. "deposits above cap" → depositOverCap. "arrears over N days" → arrearsOverDays: N. Any arrears mention without a number → arrearsOverDays: 0.`

export async function queryHandler(world: DemoWorld, question: string): Promise<ApiResponse> {
  if (!question.trim()) return { status: 400, body: { error: 'question required' } }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
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
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: question.slice(0, 2_000) }],
        }),
      })
      if (!response.ok) throw new Error(`anthropic ${response.status}`)
      const data = (await response.json()) as { content?: { text?: string }[] }
      const dsl = JSON.parse(data.content?.[0]?.text ?? '') as PortfolioQuery
      const result = runQuery(world, dsl)
      return { status: 200, body: { ...result, dsl, source: 'live' } }
    } catch {
      // fall through to canned
    } finally {
      clearTimeout(timer)
    }
  }

  const dsl = cannedParse(question)
  if (!dsl) {
    return {
      status: 200,
      body: {
        rows: [],
        summary:
          'Could not map that question. Try: "Which French units have deposits above cap?" · "Arrears over 30 days?" · "Who is moving out soon?"',
        dsl: null,
        source: 'canned',
      },
    }
  }
  const result = runQuery(world, dsl)
  return { status: 200, body: { ...result, dsl, source: 'canned' } }
}
