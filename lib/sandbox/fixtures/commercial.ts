/**
 * Synthetic economics for Product Owner review.
 * Not accounting advice and not a legal claim.
 */

export const SANDBOX_COMMERCIAL_MODEL = {
  disclaimer:
    "Synthetic sandbox economics only. Not a forecast, not accounting, not a legal commitment.",
  learning: [
    {
      kind: "UMTUBA_ORIGINAL",
      listPriceMinor: 0,
      umtubaSharePercent: 100,
      partnerSharePercent: 0,
      note: "Owned drafts. Certificate represents UMTUBA only.",
    },
    {
      kind: "PARTNER_COURSE",
      listPriceMinor: 4900,
      umtubaSharePercent: 20,
      partnerSharePercent: 80,
      note: "Sandbox revenue-share example. Provider is synthetic. Not a contract.",
    },
    {
      kind: "EXTERNAL_COURSE",
      listPriceMinor: null,
      umtubaSharePercent: null,
      partnerSharePercent: null,
      note: "Affiliate / referral UX. No hosted checkout in this preview.",
    },
  ],
  store: [
    {
      mode: "UMTUBA_OWNED",
      umtubaSharePercent: 100,
      actorSharePercent: 0,
      note: "Owned concept SKUs. Still DEMO / non-purchasable in production.",
    },
    {
      mode: "MARKETPLACE_SELLER",
      umtubaSharePercent: 15,
      actorSharePercent: 85,
      note: "Demo Marketplace Seller C. No actual payout.",
    },
    {
      mode: "DROPSHIP",
      umtubaSharePercent: 25,
      actorSharePercent: 75,
      note: "Demo Supplier B. No real supplier order.",
    },
    {
      mode: "AFFILIATE",
      umtubaSharePercent: 8,
      actorSharePercent: 0,
      note: "Referral example. PENDING CONTRACT for prospective brands.",
    },
  ],
  payouts: {
    enabled: false,
    reason: "SANDBOX · no actual payout · no real settlement",
  },
} as const;
