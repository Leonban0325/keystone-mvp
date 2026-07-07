import { DemoWorld } from '../src/engine/world'
import { buildPersona } from '../src/engine/seed/personas'
import { parseISO } from '../src/engine/compliance/dates'
import { spendOutliers } from '../src/engine/analytics'

/**
 * Addendum D2 §8: per-persona realism report. Eyeball that the data looks
 * natural AND still reconciles before locking the seed.
 *
 *   npm run verify-realism            → all ledger personas
 *   npm run verify-realism a1-meridian → one persona
 */

const PERSONAS = process.argv[2]
  ? [process.argv[2]]
  : ['a1-meridian', 'a2-sofia', 'a3-falkenrath', 'b1-haussmann', 'b2-rijnland', 'b3-ibervia']

const eur = (cents: number) => `€${(cents / 100).toLocaleString('en', { maximumFractionDigits: 0 })}`
const bar = (n: number, max: number, width = 32) => '█'.repeat(Math.max(0, Math.round((n / Math.max(1, max)) * width)))

for (const id of PERSONAS) {
  const world = new DemoWorld(buildPersona(id))
  const events = world.journal.all
  const persona = world.state.persona
  console.log(`\n━━━ ${id} — ${persona.name} · ${persona.properties.length} units · ${events.length.toLocaleString('en')} events ━━━`)

  // Rent-timing histogram: presentation → settlement lag (§2.2).
  const intents = new Map(events.filter((e) => e.kind === 'transfer_intent').map((e) => [e.id, e.date]))
  const lagBuckets = new Map<string, number>()
  let settlements = 0
  for (const e of events) {
    if (e.kind !== 'transfer_settlement' || !e.ref) continue
    const presented = intents.get(e.ref)
    if (!presented) continue
    settlements += 1
    const lag = (parseISO(e.date).getTime() - parseISO(presented).getTime()) / 86_400_000
    const bucket = lag <= 0 ? 'same-day' : lag <= 2 ? '1–2 days' : lag <= 8 ? '3–8 days' : '9+ days'
    lagBuckets.set(bucket, (lagBuckets.get(bucket) ?? 0) + 1)
  }
  console.log('  Settlement lag vs due date:')
  for (const bucket of ['same-day', '1–2 days', '3–8 days', '9+ days']) {
    const n = lagBuckets.get(bucket) ?? 0
    console.log(`    ${bucket.padEnd(9)} ${String(Math.round((n / Math.max(1, settlements)) * 100)).padStart(3)}%  ${bar(n, settlements)}`)
  }

  // Spend by month (§3) — should be lumpy and seasonal, not a flat band.
  const spendByMonth = new Map<string, number>()
  let repairCount = 0
  let capexMax = 0
  for (const e of events) {
    if (e.kind !== 'card_spend') continue
    const m = e.date.slice(0, 7)
    spendByMonth.set(m, (spendByMonth.get(m) ?? 0) + e.postings[0].amountCents)
    if (e.postings[0].dims.category === 'card:maintenance') repairCount += 1
    capexMax = Math.max(capexMax, e.postings[0].amountCents)
  }
  const months = [...spendByMonth.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-12)
  const maxSpend = Math.max(...months.map(([, v]) => v), 1)
  console.log('  Vendor/card spend by month:')
  for (const [m, v] of months) console.log(`    ${m}  ${eur(v).padStart(9)}  ${bar(v, maxSpend)}`)
  console.log(`  Maintenance events: ${repairCount} · largest single spend: ${eur(capexMax)}`)

  // Arrears arcs (§4): compensations, recoveries, current agings.
  const rLeases = new Set(
    events.filter((e) => e.kind === 'transfer_compensation').map((e) => e.postings[0].dims.leaseId),
  )
  const stillInArrears = [...world.state.arrearsSince.keys()]
  const recovered = [...rLeases].filter((l) => l && !world.state.arrearsSince.has(l))
  const reasons = new Map<string, number>()
  for (const e of events) {
    if (e.kind !== 'transfer_compensation') continue
    const code = e.memo?.match(/\((\w{2}\d{2})\)/)?.[1] ?? '??'
    reasons.set(code, (reasons.get(code) ?? 0) + 1)
  }
  console.log(
    `  Arrears: ${rLeases.size} lease(s) R-failed during the year · ${recovered.length} recovered · ${stillInArrears.length} open at epoch`,
  )
  console.log(`  R reasons: ${[...reasons.entries()].map(([c, n]) => `${c}×${n}`).join(' · ')}`)

  // Occupancy & life events (§2.3/§6).
  const moveOuts = persona.leases.filter((l) => l.moveOutDate && l.moveOutDate <= world.today).length
  const rentSteps = new Set(
    (persona.storyActions ?? []).filter((a) => a.type === 'set_rent').map((a) => a.date),
  )
  console.log(`  Life events: ${moveOuts} move-out(s) · ${rentSteps.size} indexation step(s) · outlier flags: ${spendOutliers(world).map((o) => `${o.label} ${o.ratio.toFixed(1)}×`).join(', ') || 'none'}`)

  // Aggregate reconciliation (§7, blocking): noise must not move the mean.
  const d = world.dashboard()
  if (persona.revenueTargetCents) {
    const drift = d.revenuePerUnit.total - persona.revenueTargetCents
    const ok = Math.abs(drift) <= 100
    console.log(
      `  Reconciliation: revenue/unit ${eur(d.revenuePerUnit.total)} vs model ${eur(persona.revenueTargetCents)} → ${ok ? 'OK' : `DRIFT ${eur(drift)}`} (±€1 required)`,
    )
    if (!ok) process.exitCode = 1
  } else {
    console.log(`  Reconciliation: no segment target (preview persona) · revenue/unit ${eur(d.revenuePerUnit.total)}`)
  }
}

console.log('\nSame seed → identical output every run. Lock it and ship.')
