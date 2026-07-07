/**
 * Presentation configuration (Addendum E §0).
 *
 * The partner bank is a SINGLE config field — every rails view reads it from
 * here, no bank name is hard-coded anywhere else. Set per engagement before
 * presenting. Rail providers are named by CATEGORY (accurate, shows
 * homework); nothing in the UI implies a signed integration that does not
 * exist — the "Simulated rails" badge stays on every money-movement screen.
 */
export const PARTNER_BANK = {
  name: 'Deutsche Bank AG',
  short: 'Deutsche Bank',
  descriptor: 'BaFin-regulated · Deposit Guarantee Scheme member',
  /** Statutory deposit protection shown on the vault. */
  dgsNote:
    'Entschädigungseinrichtung deutscher Banken — statutory deposit guarantee up to €100,000 per depositor per bank; segregated client accounts are insolvency-remote.',
}

/** Rail layers named by provider CLASS — truthful, no false partnership. */
export const RAILS = {
  emiClass: 'EMI / escrow-as-a-service layer (Mangopay/Lemonway class)',
  cardClass: 'EU card issuer-processor',
  kycClass: 'KYC/AML provider (CDD + screening)',
}
