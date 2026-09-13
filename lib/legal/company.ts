/**
 * Company identity placeholders. Do not invent a real address or number.
 * Replace these strings only when registration completes.
 */

export const COMPANY_LEGAL_NAME =
  "UMTUBA Limited (in registration, Republic of Ireland)";

export const REGISTERED_ADDRESS_PLACEHOLDER = "[[REGISTERED ADDRESS]]";

export const COMPANY_NUMBER_PLACEHOLDER = "[[CRN]]";

export const COMPANY_PLACEHOLDER_VALUES = {
  address: REGISTERED_ADDRESS_PLACEHOLDER,
  crn: COMPANY_NUMBER_PLACEHOLDER,
} as const;
