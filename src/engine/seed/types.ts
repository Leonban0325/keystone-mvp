import { Lease } from '../compliance/types'
import { JournalEvent, Jurisdiction } from '../ledger/types'
import { PricingTier } from '../simulators/economics'

export interface Entity {
  id: string
  name: string
  kind: 'sci' | 'individual' | 'gbr' | 'sarl' | 'stichting' | 'socimi' | 'partner'
  country: string
}

export interface Property {
  id: string
  entityId: string
  label: string
  city: string
  jurisdiction: Jurisdiction
}

export interface CoTenant {
  name: string
  shareCents: number
  /** Story flag: this co-tenant pays late (dunning targets only them). */
  paysLate?: boolean
}

/** Domain lease = compliance lease + tenancy mechanics. */
export interface SeedLease extends Lease {
  /** Present on flat-share leases: per-co-tenant split of the rent. */
  coTenants?: CoTenant[]
  /** Anniversary month-day for indexation, ISO date of last revision. */
  indexation?: { index: 'IRL' | 'CPI_NL' | 'ISTAT'; baseValue: number; lastRevised: string }
}

export type DunningStage =
  | 'current'
  | 'reminder_sent'
  | 'formal_notice'
  | 'payment_plan_offered'
  | 'escalated'

export type Role = 'owner' | 'property_manager' | 'institution' | 'partner'
export type Segment = 'A' | 'B' | 'C'

export interface PartnerData {
  apiKeys?: { label: string; key: string; created: string }[]
  funnel?: { eligible: number; activated: number; curve: { month: string; activated: number }[] }
  revShare?: { partnerSharePct: number; perUnitAnnualCents: number; activatedUnits: number }
  webhookSeed?: { event: string; endpoint: string }[]
  branches?: { name: string; x: number; y: number; live: boolean; units: number; importPct?: number }[]
  referral?: { referred: number; onboarded: number; balancesLandedCents: number; collarNote: string }
  affinityNote?: string
}

export interface LenderPackData {
  assetLabel: string
  loanCents: number
  valueCents: number
  debtServiceAnnualCents: number
  covenants: { dscrMin: number; ltvMax: number }
  occupancy: { occupied: number; total: number }
  epc: Record<string, number>
}

export interface PersonaSeed {
  id: string
  segment: Segment
  role: Role
  name: string
  subtitle: string
  pricingTier: PricingTier
  themeOverride?: { brand: string; name: string }
  /** Manager-of-owners personas: fee % skimmed before owner distribution. */
  managerFeePct?: number
  managerEntityId?: string
  /** Partner-channel personas (segment C): the Partner Console dataset. */
  partner?: PartnerData
  /** Institutional personas: refinancing-readiness pack config. */
  lenderPack?: LenderPackData
  /** Procurement badges shown on institutional dashboards. */
  procurement?: string[]
  /** Money screens watermark (expansion-market preview personas). */
  watermark?: string
  /** Demo-clock date the persona presents at ("today" on stage). */
  epoch: string
  /**
   * History replay start. The DemoWorld runs the real simulators from here to
   * `epoch` at construction, so seeded history and live behaviour share one
   * code path. Events in `events` must all be dated before this.
   */
  historyFrom: string
  entities: Entity[]
  properties: Property[]
  leases: SeedLease[]
  /** Opening journal only (capital, deposits, reserves) — dated before historyFrom. */
  events: JournalEvent[]
  /** leaseId → ISO date from which SDD collections R-fail (arrears stories). */
  forceRFrom?: Record<string, string>
  /** Total card spend per month, cents — drives the card feed + interchange. */
  cardMonthlySpendCents: number
  /** Free-form flags the UI reads for story chips. */
  storyTags: Record<string, string>
}
