/**
 * UMTUBA Store launch-mix V1 — conservative economics placeholders.
 * Payment processor is NOT finalized in-repo (FINANCE_FOUNDATION_PLACEHOLDER
 * marks paymentProcessingFees as not_configured). Do not treat these as live processor rates.
 */

export const CJ_LAUNCH_MIX_V1_TASK_ID = "UMTUBA_CJ_STORE_LAUNCH_MIX_V1" as const;
export const CJ_LAUNCH_MIX_V1_JSON_RELATIVE_PATH = "data/cj-store-launch-mix-v1.json" as const;

export const PAYMENT_FEE_LABEL = "ASSUMED_NOT_FINAL" as const;
export const PAYMENT_FEE_NOTE =
  "Placeholder card-processing assumption (2.9% + $0.30). Not a live processor rate. Store finance foundation lists payment processing fees as not_configured.";

/** 2.9% expressed as basis points of minor units: fee = round(retail * 29 / 1000) + 30 */
export const ASSUMED_PAYMENT_PERCENT_BPS = 29;
export const ASSUMED_PAYMENT_FIXED_MINOR = 30;

export type ReturnsRiskClass = "low" | "medium" | "high";

/** 3% / 6% / 8% of retail by return-risk class. */
export const RETURNS_RESERVE_RATE: Record<ReturnsRiskClass, number> = {
  low: 0.03,
  medium: 0.06,
  high: 0.08,
};

/** Conservative fraction of break-even reserved as target CPA (mid of 50–65%). */
export const TARGET_CPA_FRACTION = 0.55;

/** Minimum break-even ad cost to support a meaningful paid test. */
export const MIN_BREAK_EVEN_FOR_LAUNCH_MINOR = 400;
export const MIN_TARGET_CPA_FOR_LAUNCH_MINOR = 200;
export const MIN_NET_AT_TARGET_FOR_LAUNCH_MINOR = 200;

export const HERO_COUNT_TARGET = 15;
export const HERO_MIN = 10;
export const HERO_MAX = 20;
export const HERO_MIN_BREAK_EVEN_MINOR = 600;
export const HERO_MIN_NET_MINOR = 250;

export const LAUNCH_SELECTED_MIN = 60;
export const LAUNCH_SELECTED_MAX = 80;

/** Soft cap so one CJ family cannot dominate the mix. */
export const CATEGORY_LAUNCH_MAX = 16;

export const FAMILY_LAUNCH_CAPS = {
  silicone_phone_case: 4,
  cube_jewelry: 3,
  other_jewelry: 2,
  car_phone_holder: 8,
  phone_stand_or_card_holder: 2,
  makeup_brush_set: 6,
  cleaning_brush: 4,
  personal_care_brush: 2,
  ice_mold_or_tray: 4,
  pet_food_bowl: 8,
  pet_water_bowl: 3,
  pet_feeding_accessory: 3,
  kitchen_gadget: 8,
  car_organizer: 4,
  novelty_cube_toy: 2,
  useful_accessory: 6,
  electric_or_restricted: 0,
  beauty_chemical: 0,
} as const;

export type LaunchFamily = keyof typeof FAMILY_LAUNCH_CAPS;

export type LaunchClassification =
  | "LAUNCH_HERO"
  | "LAUNCH_STANDARD"
  | "ORGANIC_ONLY"
  | "HOLD";

export const LAUNCH_FILTERS = [
  "ALL",
  "LAUNCH_HERO",
  "LAUNCH_STANDARD",
  "ORGANIC_ONLY",
  "HOLD",
] as const;

export type LaunchFilter = (typeof LAUNCH_FILTERS)[number];
