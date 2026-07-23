import { AD_PLACEMENTS, SAFE_INTERESTS } from "../constants";
import { freezeCampaignManagementAuthority } from "./authority";

/**
 * Canonical targeting contracts for Campaign Management V1.
 * Validation only — no runtime audience evaluation or serving.
 */

export const ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION = "v1" as const;

export type AdsCampaignTargetingModel = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION;
  countries: readonly string[];
  cities: readonly string[];
  interests: readonly string[];
  languages: readonly string[];
  ageMin: number;
  ageMax: number;
  customAudienceRefs: readonly string[];
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStringArray(
  value: unknown,
  field: string,
  issues: string[],
  opts: { max: number; pattern?: RegExp; allowlist?: readonly string[] }
): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array.`);
    return [];
  }
  if (value.length > opts.max) {
    issues.push(`${field} exceeds max length of ${opts.max}.`);
  }
  const out: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push(`${field}[${i}] must be a non-empty string.`);
      continue;
    }
    const trimmed = item.trim();
    if (opts.pattern && !opts.pattern.test(trimmed)) {
      issues.push(`${field}[${i}] has an invalid format.`);
      continue;
    }
    if (opts.allowlist && !(opts.allowlist as readonly string[]).includes(trimmed)) {
      issues.push(`${field}[${i}] is not an allowed value.`);
      continue;
    }
    if (trimmed.length > 128) {
      issues.push(`${field}[${i}] exceeds max length of 128.`);
      continue;
    }
    out.push(trimmed);
  }
  return out;
}

export function parseAdsCampaignTargetingModel(
  input: unknown
):
  | { ok: true; targeting: AdsCampaignTargetingModel }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Targeting model must be an object.",
      issues: Object.freeze(["Targeting model must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION}".`
    );
  }

  const countries = parseStringArray(input.countries, "countries", issues, {
    max: 64,
    pattern: /^[A-Za-z]{2}$/,
  }).map((c) => c.toUpperCase());
  const cities = parseStringArray(input.cities, "cities", issues, { max: 64 });
  const interests = parseStringArray(input.interests, "interests", issues, {
    max: 32,
    allowlist: SAFE_INTERESTS,
  });
  const languages = parseStringArray(input.languages, "languages", issues, {
    max: 32,
    pattern: /^[a-z]{2}(-[A-Z]{2})?$/,
  });
  const customAudienceRefs = parseStringArray(
    input.customAudienceRefs,
    "customAudienceRefs",
    issues,
    { max: 32, pattern: /^[A-Za-z0-9_.:-]{1,128}$/ }
  );

  if (
    typeof input.ageMin !== "number" ||
    !Number.isInteger(input.ageMin) ||
    input.ageMin < 13 ||
    input.ageMin > 65
  ) {
    issues.push("ageMin must be an integer from 13 to 65.");
  }
  if (
    typeof input.ageMax !== "number" ||
    !Number.isInteger(input.ageMax) ||
    input.ageMax < 13 ||
    input.ageMax > 65
  ) {
    issues.push("ageMax must be an integer from 13 to 65.");
  }
  if (
    typeof input.ageMin === "number" &&
    typeof input.ageMax === "number" &&
    input.ageMax < input.ageMin
  ) {
    issues.push("ageMax must be >= ageMin.");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid targeting model.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    targeting: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION,
      countries: Object.freeze(countries),
      cities: Object.freeze(cities),
      interests: Object.freeze(interests),
      languages: Object.freeze(languages),
      ageMin: input.ageMin as number,
      ageMax: input.ageMax as number,
      customAudienceRefs: Object.freeze(customAudienceRefs),
    }),
  };
}

/** Placement configuration for ad sets (domain placements). */
export function parseAdsCampaignPlacementConfiguration(
  input: unknown
):
  | { ok: true; placements: readonly string[] }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!Array.isArray(input) || input.length === 0) {
    return {
      ok: false,
      message: "At least one placement is required.",
      issues: Object.freeze(["placements must be a non-empty array."]),
    };
  }
  const issues: string[] = [];
  const placements: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (
      typeof value !== "string" ||
      !(AD_PLACEMENTS as readonly string[]).includes(value)
    ) {
      issues.push(`placements[${i}] is not a registered domain placement.`);
      continue;
    }
    placements.push(value);
  }
  if (issues.length > 0 || placements.length === 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid placements.",
      issues: Object.freeze(
        issues.length > 0 ? issues : ["No valid placements provided."]
      ),
    };
  }
  return { ok: true, placements: Object.freeze([...new Set(placements)]) };
}
