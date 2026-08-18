/**
 * Internal partnership-readiness placeholders only.
 * Named companies are NOT public UMTUBA partners.
 * OUTREACH_SENT = 0. PARTNERSHIPS_CLAIMED = 0.
 */

export const INTERNAL_PLACEHOLDER_VISIBILITY = "INTERNAL_ONLY" as const;

export const COMMERCE_INTERNAL_PLACEHOLDERS = [
  "SHEIN",
  "Temu",
  "AliExpress",
  "Alibaba",
  "Trendyol",
  "Amazon",
  "eBay",
  "DHgate",
] as const;

export const LEARNING_INTERNAL_PLACEHOLDERS = [
  "Coursera",
  "Udemy",
  "edX",
  "DataCamp",
  "FutureLearn",
  "Skillshare",
  "MasterClass",
] as const;

export type InternalPlaceholderTarget = {
  name: string;
  domain: "STORE" | "LEARNING";
  visibility: typeof INTERNAL_PLACEHOLDER_VISIBILITY;
  publicPartnerClaimAllowed: false;
  outreachAllowed: false;
  partnershipClaimed: false;
};

function toTarget(
  name: string,
  domain: "STORE" | "LEARNING"
): InternalPlaceholderTarget {
  return {
    name,
    domain,
    visibility: INTERNAL_PLACEHOLDER_VISIBILITY,
    publicPartnerClaimAllowed: false,
    outreachAllowed: false,
    partnershipClaimed: false,
  };
}

export const INTERNAL_PLACEHOLDER_TARGETS: readonly InternalPlaceholderTarget[] = [
  ...COMMERCE_INTERNAL_PLACEHOLDERS.map((name) => toTarget(name, "STORE")),
  ...LEARNING_INTERNAL_PLACEHOLDERS.map((name) => toTarget(name, "LEARNING")),
];

export function summarizeInternalPlaceholders(): {
  outreachSent: 0;
  partnershipsClaimed: 0;
  publicPartnerNames: string[];
  internalCount: number;
} {
  return {
    outreachSent: 0,
    partnershipsClaimed: 0,
    publicPartnerNames: [],
    internalCount: INTERNAL_PLACEHOLDER_TARGETS.length,
  };
}

export function assertNotPublicUmtubaPartner(name: string): {
  ok: boolean;
  reason: string;
} {
  const match = INTERNAL_PLACEHOLDER_TARGETS.find(
    (row) => row.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (!match) {
    return { ok: true, reason: "Not an internal placeholder target." };
  }
  return {
    ok: false,
    reason: `${match.name} is an internal placeholder only and must not be shown as a public UMTUBA partner.`,
  };
}

export function publicSurfaceMayClaimPartnership(name: string): false {
  void name;
  return false;
}
