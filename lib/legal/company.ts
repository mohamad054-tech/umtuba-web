/**
 * Single source for company identity placeholders.
 * Never invent a registered address or company number.
 */

export const LEGAL_COMPANY_LINE =
  "UMTUBA Limited (in registration, Republic of Ireland)";

export const LEGAL_REGISTERED_ADDRESS = "[[REGISTERED ADDRESS]]";

export const LEGAL_CRN = "[[CRN]]";

/** Shown on legal pages. Source: legal-en.md / legal-ar.md. */
export const LEGAL_EFFECTIVE_DATE = "on public launch";

export const LEGAL_LAST_UPDATED = "13 September 2026";

/**
 * Draft banner on privacy, terms, cookies, community-guidelines, copyright.
 * Set to false in this one place to remove the banner.
 */
export const LEGAL_DRAFT_BANNER_ENABLED = true;

export function legalCompanyInterpolateValues(): Record<string, string> {
  return {
    registeredAddress: LEGAL_REGISTERED_ADDRESS,
    crn: LEGAL_CRN,
    companyLine: LEGAL_COMPANY_LINE,
  };
}
