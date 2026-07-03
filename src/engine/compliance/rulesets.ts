import fr from './rulesets/fr.json'
import nl from './rulesets/nl.json'
import es from './rulesets/es.json'
import { Ruleset } from './types'

export const RULESETS = new Map<string, Ruleset>([
  ['FR', fr as Ruleset],
  ['NL', nl as Ruleset],
  ['ES', es as Ruleset],
])
