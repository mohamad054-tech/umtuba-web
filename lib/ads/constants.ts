export const AD_CREATIVES_BUCKET = "ad-creatives";
export const MAX_AD_CREATIVE_BYTES = 50 * 1024 * 1024;

export const AD_PLACEMENTS = [
  "discover_feed",
  "watch_feed",
  "stories",
  "live_lobby",
  "search_results",
  "store_catalog",
  "profile_feed",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** V1 delivery is disabled — placements are contracts only. */
export const ADS_DELIVERY_ENABLED = false;

export const ADVERTISER_ROLES = [
  "owner",
  "admin",
  "campaign_manager",
  "analyst",
  "viewer",
] as const;

export type AdvertiserRole = (typeof ADVERTISER_ROLES)[number];

export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "traffic",
  "engagement",
  "video_views",
  "app_installs",
  "store_visits",
  "product_sales",
] as const;

export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

export const CREATIVE_TYPES = ["image", "video", "story", "native"] as const;
export type CreativeType = (typeof CREATIVE_TYPES)[number];

export const CTA_TYPES = [
  "learn_more",
  "shop_now",
  "sign_up",
  "watch_more",
  "install",
  "contact_us",
  "book_now",
] as const;

export type CallToAction = (typeof CTA_TYPES)[number];

/** Interests allowlist — no sensitive categories. */
export const SAFE_INTERESTS = [
  "gaming",
  "music",
  "sports",
  "fashion",
  "food",
  "travel",
  "technology",
  "education",
  "entertainment",
  "shopping",
  "fitness",
  "art",
] as const;

/** Explicitly prohibited targeting attributes in V1. */
export const PROHIBITED_TARGETING_ATTRIBUTES = [
  "religion",
  "political_affiliation",
  "health_condition",
  "sexual_orientation",
  "racial_ethnicity",
  "specific_user_id",
  "private_messages",
  "contacts",
] as const;

export const MIN_TARGET_AGE = 13;
export const MAX_TARGET_AGE = 65;
/** Soft contract for future audience estimation. */
export const MIN_ESTIMATED_AUDIENCE = 1000;

export const ALLOWED_CREATIVE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
