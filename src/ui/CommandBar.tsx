import { useEffect, useRef, useState } from 'react'
import { useApp } from './store'
import { Badge } from './components'
import { searchAll, SearchHit } from '../engine/analytics'
import { cannedParse, runQuery, QueryRow } from '../engine/queryDsl'
import { queryViaApi } from '../api/client'

/**
 * §6 Cmd-K command bar, two modes:
 *  - Search: tenant · address · lease · owner → deep link (deterministic).
 *  - Ask (Tab, or end with "?"): natural-language portfolio query — the AI
 *    (server-side, key never in the browser) writes a structured WHERE
 *    clause, plain code executes it over the dataset. Offline or keyless it
 *    falls back to the canned matcher; the three seeded questions always work.
 */

const EXAMPLE_QUESTIONS = [
  'Which French units have deposits above cap?',
  'Arrears over 30 days?',
  'Who is moving out soon?',
]

interface Answer {
  summary: string
  rows: QueryRow[]
  source: 'live' | 'canned'
}

export default function CommandBar() {
  const { world, personaId, setScreen, setFocus } = useApp()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'search' | 'ask'>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [asking, setAsking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setMode('search')
        setQuery('')
        setSelected(0)
        setAnswer(null)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hits = mode === 'search' && query ? searchAll(world, query) : []

  const go = (hit: SearchHit) => {
    setOpen(false)
    switch (hit.type) {
      case 'tenant':
        setFocus({ leaseId: hit.leaseId })
        setScreen('reports') // → that tenant's quittance
        break
      case 'lease':
        setFocus({ leaseId: hit.leaseId, propertyId: hit.propertyId })
        setScreen('money') // → that lease's ledger
        break
      case 'owner':
        setFocus({ entityId: hit.entityId })
        setScreen('money') // → that owner's roll-up
        break
      case 'property':
        setFocus({ propertyId: hit.propertyId })
        setScreen('leases') // → that property's card
        break
    }
  }

  const goRow = (row: QueryRow) => {
    setOpen(false)
    setFocus({ leaseId: row.lease })
    setScreen('money')
  }

  async function runAsk(question: string) {
    if (!question.trim()) return
    setAsking(true)
    setAnswer(null)
    // Server first (AI translation when a key is configured); local canned
    // matcher when the API is unreachable — identical execution semantics.
    const remote = await queryViaApi(personaId, question)
    if (remote) {
      setAnswer({
        summary: remote.summary,
        rows: (remote.rows as unknown as QueryRow[]) ?? [],
        source: remote.source,
      })
    } else {
      const dsl = cannedParse(question)
      if (dsl) {
        const result = runQuery(world, dsl)
        setAnswer({ summary: result.summary, rows: result.rows, source: 'canned' })
      } else {
        setAnswer({
          summary: `Could not map that question. Try: ${EXAMPLE_QUESTIONS.join(' · ')}`,
          rows: [],
          source: 'canned',
        })
      }
    }
    setAsking(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border rule px-2 py-0.5 text-xs text-greyx hover:border-ink hover:text-ink"
        title="Search or ask anything"
      >
        <span>Search / Ask</span>
        <span className="border rule px-1 text-[10px]">⌘K</span>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border rule px-2 py-0.5 text-xs text-greyx"
      >
        <span>Search / Ask</span>
        <span className="border rule px-1 text-[10px]">⌘K</span>
      </button>
      <div
        className="fixed inset-0 z-30 flex items-start justify-center bg-ink/20 pt-[15vh]"
        onClick={() => setOpen(false)}
      >
        <div
          className="w-full max-w-xl border rule bg-paper shadow-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex border-b rule text-xs">
            {(['search', 'ask'] as const).map((m) => (
              <button
                key={m}
                className={`px-4 py-2 uppercase tracking-[0.08em] ${mode === m ? 'border-b-2 border-brass text-ink' : 'text-greyx'}`}
                onClick={() => {
                  setMode(m)
                  setAnswer(null)
                  inputRef.current?.focus()
                }}
              >
                {m === 'search' ? 'Search' : 'Ask'}
              </button>
            ))}
            <span className="ml-auto self-center px-4 text-[10px] text-greyx">Tab switches mode</span>
          </div>
          <input
            ref={inputRef}
            className="w-full border-b rule bg-transparent px-4 py-3 text-sm outline-none"
            placeholder={
              mode === 'search'
                ? 'tenant · address · lease · owner…'
                : 'e.g. “Which French units have deposits above cap?”'
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                setMode((m) => (m === 'search' ? 'ask' : 'search'))
                setAnswer(null)
                return
              }
              if (mode === 'search') {
                if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, hits.length - 1))
                if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0))
                if (e.key === 'Enter') {
                  // A question mark means the user is asking, not searching.
                  if (query.trim().endsWith('?')) {
                    setMode('ask')
                    void runAsk(query)
                  } else if (hits[selected]) go(hits[selected])
                }
              } else if (e.key === 'Enter') {
                void runAsk(query)
              }
            }}
          />
          <div className="max-h-80 overflow-y-auto">
            {mode === 'search' && query && hits.length === 0 && (
              <div className="px-4 py-3 text-sm text-greyx">No matches.</div>
            )}
            {mode === 'search' &&
              hits.map((hit, i) => (
                <button
                  key={`${hit.type}-${hit.label}-${i}`}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${i === selected ? 'bg-white/70' : 'hover:bg-white/50'}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => go(hit)}
                >
                  <span>
                    <span className="font-medium">{hit.label}</span>
                    <span className="ml-2 text-xs text-greyx">{hit.sub}</span>
                  </span>
                  <Badge tone="grey">{hit.type}</Badge>
                </button>
              ))}

            {mode === 'ask' && !answer && !asking && (
              <div className="px-4 py-3 text-sm text-greyx">
                <div className="mb-2 text-[10px] uppercase tracking-[0.08em]">Try one</div>
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="block w-full border-b rule py-1.5 text-left hover:text-ink"
                    onClick={() => {
                      setQuery(q)
                      void runAsk(q)
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {mode === 'ask' && asking && (
              <div className="px-4 py-3 text-sm text-greyx">Querying the dataset…</div>
            )}
            {mode === 'ask' && answer && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{answer.summary}</span>
                  <Badge tone={answer.source === 'live' ? 'brass' : 'grey'}>
                    {answer.source === 'live' ? 'AI + ledger' : 'canned match'}
                  </Badge>
                </div>
                {answer.rows.map((row) => (
                  <button
                    key={row.lease}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-white/50"
                    onClick={() => goRow(row)}
                  >
                    <span>
                      <span className="font-medium">{row.tenant}</span>
                      <span className="ml-2 text-xs text-greyx">
                        {row.property} · {row.jurisdiction}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-greyx">
                      rent €{row.rentEur.toFixed(0)}
                      {row.arrearsEur > 0 ? ` · arrears €${row.arrearsEur.toFixed(0)}` : ''}
                      {row.daysInArrears != null ? ` · ${row.daysInArrears}d` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t rule px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-greyx">
            {mode === 'search'
              ? 'tenant → quittance · owner/lease → money · property → detail card'
              : 'AI writes the query · deterministic code executes it · rows → money'}
          </div>
        </div>
      </div>
    </>
  )
}
