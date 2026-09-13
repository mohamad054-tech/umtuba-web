export const LAB_BANNER = "TEST / SANDBOX / NO REAL VALUE" as const;
export const LAB_SUBTITLE =
  "Private digital-asset lab. Synthetic balances only. Not money, not an investment, not a live token." as const;
export const CONVERSION_UNAVAILABLE_COPY =
  "Point-to-token conversion is disabled. This lab does not convert real UM Points." as const;
export const NO_ACTIONABLE_CONVERT_COPY =
  "Convert is not available." as const;
export const TREASURY_COPY =
  "Treasury figures are sandbox placeholders. TOKEN_SUPPLY, TOKEN_PRICE, and CONVERSION_RATE remain UNDECIDED." as const;
export const COMPLIANCE_COPY =
  "KYC / AML / sanctions / region / age fields are synthetic lab states only. No real identity is collected." as const;
export const LEGAL_COPY =
  "LEGAL_CLASSIFICATION = REQUIRES_QUALIFIED_LEGAL_COUNSEL. This lab is not a legal opinion." as const;

export function userPreviewNotice(conversionEnabled: boolean): string {
  if (!conversionEnabled) {
    return `${LAB_BANNER}. ${CONVERSION_UNAVAILABLE_COPY} ${NO_ACTIONABLE_CONVERT_COPY}`;
  }
  return `${LAB_BANNER}. Isolated test conversion is on for this lab instance only.`;
}
