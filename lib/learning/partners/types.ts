/**
 * UMTUBA Learning partner marketplace types.
 *
 * External courses stay attributed to their source platform.
 * UMTUBA does not host partner video or issue partner certificates.
 */

export const LEARNING_PARTNER_PROVIDER_IDS = [
  "coursera",
  "edx",
  "skillshare",
  "udemy",
] as const;
export type LearningPartnerProviderId =
  (typeof LEARNING_PARTNER_PROVIDER_IDS)[number];

export const LEARNING_CERTIFICATE_TYPES = [
  "COMPLETION",
  "PROFESSIONAL",
  "VERIFIED",
  "UNIVERSITY_PROVIDER",
  "ACADEMIC_CREDIT",
  "DEGREE_OR_FORMAL_QUALIFICATION",
  "NONE",
  "UNKNOWN",
] as const;
export type LearningCertificateType =
  (typeof LEARNING_CERTIFICATE_TYPES)[number];

export const LEARNING_COURSE_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "MIXED",
  "UNKNOWN",
] as const;
export type LearningCourseLevel = (typeof LEARNING_COURSE_LEVELS)[number];

export const LEARNING_PRICE_MODELS = [
  "FREE",
  "PAID",
  "SUBSCRIPTION",
  "FREEMIUM",
  "UNKNOWN",
] as const;
export type LearningPriceModel = (typeof LEARNING_PRICE_MODELS)[number];

export const LEARNING_AFFILIATE_NETWORKS = [
  "IMPACT",
  "DIRECT",
  "OTHER",
  "NONE",
] as const;
export type LearningAffiliateNetwork =
  (typeof LEARNING_AFFILIATE_NETWORKS)[number];

export const LEARNING_AFFILIATE_PROGRAM_STATUSES = [
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "NOT_APPLICABLE",
] as const;
export type LearningAffiliateProgramStatus =
  (typeof LEARNING_AFFILIATE_PROGRAM_STATUSES)[number];

export const LEARNING_RECOMMENDATION_LABELS = [
  "BEGINNER",
  "CAREER_FOCUSED",
  "BEST_VALUE",
  "MOST_POPULAR",
] as const;
export type LearningRecommendationLabel =
  (typeof LEARNING_RECOMMENDATION_LABELS)[number];

export type LocalizedText = {
  en: string;
  ar: string;
};

export type LearningCertificateMetadata = {
  certificate_available: boolean;
  certificate_type: LearningCertificateType;
  /** Who issues the credential. Never UMTUBA for external courses. */
  certificate_issuer: string | null;
  verification_available: boolean | null;
  /** True only when that specific program is documented as credit-bearing. */
  academic_credit: boolean | null;
  /**
   * Customer-facing “accredited / officially recognized” is allowed only when
   * this is true AND accreditation_source is present AND accreditation_verified.
   */
  accreditation_claim: boolean;
  accreditation_source: string | null;
  accreditation_verified: boolean;
  certificate_notes: LocalizedText;
};

export type LearningAffiliateRecord = {
  provider: LearningPartnerProviderId;
  affiliate_network: LearningAffiliateNetwork;
  affiliate_program_status: LearningAffiliateProgramStatus;
  /** Null until the program is APPROVED. Never invent tracking IDs. */
  affiliate_tracking_url: string | null;
  commission_model: {
    kind: "PERCENT_RANGE" | "PERCENT" | "REVENUE_SHARE_CAP" | "UNKNOWN";
    published_summary: string;
    notes: string;
  };
  cookie_window_days: number | null;
  last_verified_at: string;
};

export type LearningProviderFacts = {
  provider: LearningPartnerProviderId;
  display_name: string;
  official_affiliate: boolean;
  affiliate_network: LearningAffiliateNetwork;
  application_url: string;
  commission_published_summary: string;
  cookie_window_days: number | null;
  catalog_notes: string;
  exclusions: string[];
  last_verified_at: string;
  verification_source_urls: readonly string[];
  administratively_updateable: true;
};

export type LearningPartnerCourse = {
  id: string;
  slug: string;
  /** Original title as published by the source platform. */
  original_title: string;
  title_en: string;
  title_ar: string;
  provider: LearningPartnerProviderId;
  institution: string | null;
  instructor: string | null;
  source_platform: LearningPartnerProviderId;
  original_course_url: string;
  affiliate_tracking_url: string | null;
  department: string;
  subcategory: string;
  level: LearningCourseLevel;
  duration_notes: LocalizedText;
  language: "en" | "ar" | "mixed" | "unknown";
  languages_available: readonly string[];
  pricing: {
    model: LearningPriceModel;
    amount: number | null;
    currency: string | null;
    notes: LocalizedText;
  };
  rating: {
    value: number | null;
    scale: number;
    source: string | null;
  };
  /** Only when a program-supplied / permitted asset exists. */
  image_url: string | null;
  certificate: LearningCertificateMetadata;
  recommendation_labels: readonly LearningRecommendationLabel[];
  career_focused: boolean;
  source_attribution: LocalizedText;
  source_citation_url: string;
  facts_last_verified_at: string;
  umtuba_created: false;
  record_kind: "COURSE";
};

export type LearningPathFoundation = {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  course_ids: readonly string[];
  /** Discovery grouping only — not an official multi-provider credential. */
  official_combined_certificate: false;
};

export type LearningPartnerPilotFile = {
  task_id: "UMTUBA_LEARNING_PARTNER_MARKETPLACE_FOUNDATION_V1";
  generated_at: string;
  catalog_mode: "LOCAL_QA_SAMPLE";
  live_feed_imported: false;
  affiliate_applications_submitted: false;
  umtuba_hosts_partner_content: false;
  umtuba_issues_partner_certificates: false;
  sample_honesty_notes: string;
  providers: LearningPartnerProviderId[];
  courses: LearningPartnerCourse[];
  learning_paths: LearningPathFoundation[];
};
