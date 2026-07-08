import { Jurisdiction } from '../engine/ledger/types'

/**
 * G §2: properties group by administrative region — Île-de-France,
 * Auvergne-Rhône-Alpes… for France; province/land for other markets.
 */
const CITY_REGION: [RegExp, string][] = [
  [/^paris|levallois|boulogne-billancourt|neuilly|montreuil/i, 'Île-de-France'],
  [/^lyon|villeurbanne|grenoble/i, 'Auvergne-Rhône-Alpes'],
  [/^marseille|nice|toulon|aix/i, 'Provence-Alpes-Côte d’Azur'],
  [/^bordeaux/i, 'Nouvelle-Aquitaine'],
  [/^amsterdam|haarlem/i, 'Noord-Holland'],
  [/^rotterdam|leiden|leiderdorp|oegstgeest|den haag/i, 'Zuid-Holland'],
  [/^barcelona/i, 'Catalunya'],
  [/^madrid/i, 'Comunidad de Madrid'],
  [/^münchen|munich/i, 'Bayern'],
  [/^berlin/i, 'Berlin'],
  [/^wien|vienna/i, 'Wien'],
  [/^milano|roma/i, 'Italia'],
]

const COUNTRY_FALLBACK: Record<string, string> = {
  FR: 'France — other regions',
  NL: 'Netherlands — other provinces',
  ES: 'España — otras regiones',
  DE: 'Deutschland — weitere Länder',
  AT: 'Österreich',
  IT: 'Italia',
}

export function regionOf(city: string, jurisdiction: Jurisdiction | string): string {
  for (const [pattern, region] of CITY_REGION) {
    if (pattern.test(city)) return region
  }
  return COUNTRY_FALLBACK[jurisdiction] ?? jurisdiction
}
