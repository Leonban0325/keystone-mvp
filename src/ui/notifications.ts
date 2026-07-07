import { DemoWorld } from '../engine/world'
import { daysBetween } from '../engine/compliance/dates'
import { eur } from './format'
import type { Focus, Screen } from './store'

/**
 * §4 notifications & "needs attention" — derived live from the world state
 * (findings, clocks, arrears, journal tail), never stored. Advancing the
 * demo clock changes this list in front of the audience: the system is
 * running, not just being viewed.
 */

export interface Notice {
  id: string
  kind: 'finding' | 'clock' | 'arrears' | 'payout' | 'savings'
  severity: 'act' | 'watch' | 'done'
  title: string
  detail: string
  screen: Screen
  focus?: Focus
}

export function buildNotices(world: DemoWorld): Notice[] {
  const notices: Notice[] = []
  const today = world.today

  for (const finding of world.findings()) {
    if (finding.severity === 'violation') {
      notices.push({
        id: `f-${finding.ruleId}-${finding.leaseId}`,
        kind: 'finding',
        severity: 'act',
        title: `${finding.ruleId} — violation open`,
        detail: finding.message,
        screen: 'compliance',
        focus: { leaseId: finding.leaseId },
      })
    } else if (finding.ruleId.includes('RETURN') && finding.meta?.daysRemaining !== undefined) {
      const days = Number(finding.meta.daysRemaining)
      notices.push({
        id: `c-${finding.ruleId}-${finding.leaseId}`,
        kind: 'clock',
        severity: days <= 5 ? 'act' : 'watch',
        title: `Deposit return clock — ${days} day${days === 1 ? '' : 's'} left`,
        detail: finding.message,
        screen: 'compliance',
        focus: { leaseId: finding.leaseId },
      })
    } else if (finding.severity === 'warning') {
      notices.push({
        id: `w-${finding.ruleId}-${finding.leaseId}`,
        kind: 'finding',
        severity: 'watch',
        title: `${finding.ruleId} — warning`,
        detail: finding.message,
        screen: 'compliance',
        focus: { leaseId: finding.leaseId },
      })
    }
  }

  // Arrears escalations, oldest first.
  const arrears = [...world.state.arrearsSince.entries()]
    .map(([leaseId, since]) => ({ leaseId, since, days: daysBetween(since, today) }))
    .sort((a, b) => b.days - a.days)
  for (const a of arrears.slice(0, 4)) {
    const stage = world.dunningStage(a.leaseId)
    if (stage === 'current') continue
    const lease = world.state.leases.find((l) => l.id === a.leaseId)
    notices.push({
      id: `a-${a.leaseId}`,
      kind: 'arrears',
      severity: a.days >= 45 ? 'act' : 'watch',
      title: `Arrears ${a.days}d — ${stage.replace(/_/g, ' ')}`,
      detail: `${lease?.tenantNames.join(', ') ?? a.leaseId} · dunning FSM at "${stage.replace(/_/g, ' ')}"`,
      screen: 'compliance',
      focus: { leaseId: a.leaseId },
    })
  }

  // Recent completions from the journal tail (what the system just did).
  const recent = [...world.journal.all].slice(-400).reverse()
  const payout = recent.find((e) => e.kind === 'owner_distribution')
  if (payout) {
    notices.push({
      id: `p-${payout.id}`,
      kind: 'payout',
      severity: 'done',
      title: `Payout run completed — ${eur(payout.postings[0].amountCents)}`,
      detail: `${payout.memo ?? 'Owner distribution'} · ${payout.date}`,
      screen: 'rails',
      focus: { eventId: payout.id },
    })
  }
  const savings = recent.find((e) => e.kind === 'savings_success_fee')
  if (savings) {
    notices.push({
      id: `s-${savings.id}`,
      kind: 'savings',
      severity: 'done',
      title: 'Savings realized',
      detail: `${savings.memo ?? 'Success fee'} · ${savings.date}`,
      screen: 'savings',
    })
  }

  const order = { act: 0, watch: 1, done: 2 }
  return notices.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 12)
}

/** Dashboard "action required" queue: the 2–4 things to act on today. */
export function actionQueue(world: DemoWorld): Notice[] {
  return buildNotices(world)
    .filter((n) => n.severity === 'act')
    .slice(0, 4)
}
