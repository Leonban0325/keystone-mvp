import { useEffect, useRef, useState } from 'react'
import { useApp } from './store'
import { Badge } from './components'
import { searchAll, SearchHit } from '../engine/analytics'

/**
 * §6 Cmd-K command bar: tenant · address · lease · owner → deep link.
 * Type "Laurent" and land instantly instead of scrolling 850 rows.
 */
export default function CommandBar() {
  const { world, setScreen, setFocus } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const hits = query ? searchAll(world, query) : []

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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border rule px-2 py-0.5 text-xs text-greyx hover:border-ink hover:text-ink"
        title="Search everything"
      >
        <span>Search</span>
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
        <span>Search</span>
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
          <input
            ref={inputRef}
            className="w-full border-b rule bg-transparent px-4 py-3 text-sm outline-none"
            placeholder="tenant · address · lease · owner…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, hits.length - 1))
              if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0))
              if (e.key === 'Enter' && hits[selected]) go(hits[selected])
            }}
          />
          <div className="max-h-80 overflow-y-auto">
            {query && hits.length === 0 && (
              <div className="px-4 py-3 text-sm text-greyx">No matches.</div>
            )}
            {hits.map((hit, i) => (
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
          </div>
          <div className="border-t rule px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-greyx">
            tenant → quittance · owner/lease → money · property → detail card
          </div>
        </div>
      </div>
    </>
  )
}
