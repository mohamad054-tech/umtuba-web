import type {
  LearningAffiliateRecord,
  LearningPartnerProviderId,
  LearningProviderFacts,
} from "./types";

/**
 * Administrative provider facts. Updateable. Not permanent.
 * last_verified_at is required. Do not treat these as live contract terms.
 */
export const LEARNING_PROVIDER_FACTS: readonly LearningProviderFacts[] = [
  {
    provider: "coursera",
    display_name: "Coursera",
    official_affiliate: true,
    affiliate_network: "IMPACT",
    application_url: "https://www.coursera.org/about/affiliates",
    commission_published_summary: "Baseline 15%–45% on eligible purchases",
    cookie_window_days: 30,
    catalog_notes:
      "Official affiliate page advertises 4,000+ eligible courses and Specializations, plus professional certificates and Coursera Plus. Degrees and “Certificate purchases” are excluded per the page footnote.",
    exclusions: ["Degrees", "Certificate purchases (per Coursera affiliate FAQ footnote)"],
    last_verified_at: "2026-09-09",
    verification_source_urls: ["https://www.coursera.org/about/affiliates"],
    administratively_updateable: true,
  },
  {
    provider: "edx",
    display_name: "edX",
    official_affiliate: true,
    affiliate_network: "IMPACT",
    application_url: "https://www.edx.org/affiliate-program",
    commission_published_summary:
      "Starting 10% for ordinary affiliates; 5% for voucher/coupon/discount sites",
    cookie_window_days: 60,
    catalog_notes:
      "Commission on verified certificates and pay-only courses through tracked assets. Masters and Boot Camps are excluded.",
    exclusions: ["Masters", "Boot Camps"],
    last_verified_at: "2026-09-09",
    verification_source_urls: ["https://www.edx.org/affiliate-program"],
    administratively_updateable: true,
  },
  {
    provider: "skillshare",
    display_name: "Skillshare",
    official_affiliate: true,
    affiliate_network: "IMPACT",
    application_url: "https://www.skillshare.com/en/affiliates",
    commission_published_summary:
      "20% of revenue, up to $34, for qualifying new paid customers",
    cookie_window_days: 30,
    catalog_notes:
      "Official program is membership referral, not a public course data feed. Individual class metadata is not imported until an approved merchandiser/feed exists.",
    exclusions: [],
    last_verified_at: "2026-09-09",
    verification_source_urls: ["https://www.skillshare.com/en/affiliates"],
    administratively_updateable: true,
  },
  {
    provider: "udemy",
    display_name: "Udemy",
    official_affiliate: true,
    affiliate_network: "IMPACT",
    application_url: "https://www.udemy.com/affiliate/",
    commission_published_summary:
      "Administratively recorded baseline 10%. Public marketing page historically describes “competitive commission rates”; exact public % was not independently re-confirmed this session (affiliate page fetch timed out on 2026-09-09).",
    cookie_window_days: 7,
    catalog_notes:
      "Official via Impact. Approval requirements must be respected. New Affiliate API access has been discontinued since 2025-01-01 per Udemy developer docs (2026-08-18 research).",
    exclusions: [],
    last_verified_at: "2026-08-18",
    verification_source_urls: [
      "https://www.udemy.com/affiliate/",
      "https://www.udemy.com/developers/affiliate/",
    ],
    administratively_updateable: true,
  },
] as const;

export const LEARNING_AFFILIATE_RECORDS: readonly LearningAffiliateRecord[] =
  LEARNING_PROVIDER_FACTS.map((facts) => ({
    provider: facts.provider,
    affiliate_network: facts.affiliate_network,
    affiliate_program_status: "PENDING",
    affiliate_tracking_url: null,
    commission_model: commissionModelFor(facts.provider),
    cookie_window_days: facts.cookie_window_days,
    last_verified_at: facts.last_verified_at,
  }));

function commissionModelFor(
  provider: LearningPartnerProviderId
): LearningAffiliateRecord["commission_model"] {
  switch (provider) {
    case "coursera":
      return {
        kind: "PERCENT_RANGE",
        published_summary: "15%–45% baseline on eligible purchases",
        notes: "Last-click. Coursera Plus and eligible catalog included; degrees excluded.",
      };
    case "edx":
      return {
        kind: "PERCENT",
        published_summary: "Starting 10% ordinary affiliates (5% voucher sites)",
        notes: "Verified certificates and pay-only courses only. Masters/Boot Camps excluded.",
      };
    case "skillshare":
      return {
        kind: "REVENUE_SHARE_CAP",
        published_summary: "20% of revenue, up to $34, qualifying new customers",
        notes: "30-day window for new paid memberships.",
      };
    case "udemy":
      return {
        kind: "PERCENT",
        published_summary: "Administratively recorded baseline 10%",
        notes: "7-day cookie per administrative record. Public page % not re-fetched 2026-09-09.",
      };
  }
}

export function getLearningProviderFacts(
  provider: LearningPartnerProviderId
): LearningProviderFacts {
  const row = LEARNING_PROVIDER_FACTS.find((item) => item.provider === provider);
  if (!row) {
    throw new Error(`Missing provider facts for ${provider}`);
  }
  return row;
}

export function getLearningAffiliateRecord(
  provider: LearningPartnerProviderId
): LearningAffiliateRecord {
  const row = LEARNING_AFFILIATE_RECORDS.find((item) => item.provider === provider);
  if (!row) {
    throw new Error(`Missing affiliate record for ${provider}`);
  }
  return row;
}

export function providerDisplayName(
  provider: LearningPartnerProviderId
): string {
  return getLearningProviderFacts(provider).display_name;
}

export function providerHomeUrl(provider: LearningPartnerProviderId): string {
  switch (provider) {
    case "coursera":
      return "https://www.coursera.org/";
    case "edx":
      return "https://www.edx.org/";
    case "skillshare":
      return "https://www.skillshare.com/";
    case "udemy":
      return "https://www.udemy.com/";
  }
}
