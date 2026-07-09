import { Role } from '../engine/seed/types'
import type { Screen } from './store'

/**
 * RBAC screen map (Addendum F §3). Navigation renders only the role's
 * permitted sections, and the store refuses to enter a screen outside the
 * role's set — an unauthorized route lands on the role's own home, never an
 * error. (The API enforces the data side per session token.)
 */

export const NAV_BY_ROLE: Record<Role, Screen[]> = {
  owner: ['dashboard', 'leases', 'compliance', 'money', 'card', 'savings', 'reports'],
  property_manager: ['dashboard', 'rollup', 'leases', 'compliance', 'money', 'card', 'savings', 'reports'],
  institution: ['dashboard', 'lenderpack', 'leases', 'compliance', 'money', 'card', 'reports'],
  partner: ['partner'],
}

/**
 * Everything the role may open — the nav plus contextual screens: payment
 * processing (reached from a transaction, G §7) and the internal /system
 * view.
 */
export function allowedScreens(role: Role, demoClean: boolean): Set<Screen> {
  const screens = new Set<Screen>(NAV_BY_ROLE[role])
  if (role !== 'partner') screens.add('rails')
  if (!demoClean) screens.add('system')
  return screens
}

export function defaultScreen(role: Role): Screen {
  if (role === 'partner') return 'partner'
  if (role === 'property_manager') return 'rollup'
  return 'dashboard'
}
