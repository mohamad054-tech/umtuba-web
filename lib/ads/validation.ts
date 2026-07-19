import { isValidCurrencyCode, validateAmountMinor } from "../store/money";
import {
  AD_PLACEMENTS,
  ALLOWED_CREATIVE_MIME_TYPES,
  MAX_AD_CREATIVE_BYTES,
  MAX_TARGET_AGE,
  MIN_ESTIMATED_AUDIENCE,
  MIN_TARGET_AGE,
  PROHIBITED_TARGETING_ATTRIBUTES,
  SAFE_INTERESTS,
  type AdPlacement,
} from "./constants";
import type { CampaignTargeting } from "./types";

const COUNTRY_RE = /^[A-Z]{2}$/;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export function validateCountryCode(raw: string):
  | { ok: true; code: string }
  | { ok: false; message: string } {
  const code = raw.trim().toUpperCase();
  if (!COUNTRY_RE.test(code)) {
    return { ok: false, message: "Country code must be 2 letters." };
  }
  return { ok: true, code };
}

export function validateDestinationUrl(raw: string):
  | { ok: true; url: string }
  | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "Destination URL is required." };
  }
  if (value.length > 500 || /\s/.test(value)) {
    return { ok: false, message: "Destination URL is invalid." };
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, message: "Destination URL is invalid." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Destination URL must use https." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, message: "Destination URL cannot include credentials." };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host.length > 253 ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.includes(" ")
  ) {
    return { ok: false, message: "Destination URL hostname is invalid." };
  }
  return { ok: true, url: parsed.toString() };
}

/** Soft upper bound for campaign budgets (minor units). */
export const MAX_BUDGET_MINOR = 1_000_000_000_000;

export function validateCampaignBudget(input: {
  dailyBudgetMinor: unknown;
  totalBudgetMinor: unknown;
  currencyCode: string;
}): { ok: true; daily: number | null; total: number | null; currency: string } | { ok: false; message: string } {
  if (!isValidCurrencyCode(input.currencyCode)) {
    return { ok: false, message: "Currency must be a 3-letter ISO code." };
  }
  const currency = input.currencyCode.trim().toUpperCase();

  let daily: number | null = null;
  let total: number | null = null;

  if (input.dailyBudgetMinor != null && input.dailyBudgetMinor !== "") {
    const r = validateAmountMinor(input.dailyBudgetMinor, currency);
    if (!r.ok) return r;
    if (r.amountMinor <= 0) {
      return { ok: false, message: "Daily budget must be greater than zero." };
    }
    if (r.amountMinor > MAX_BUDGET_MINOR) {
      return { ok: false, message: "Daily budget exceeds the allowed maximum." };
    }
    daily = r.amountMinor;
  }

  if (input.totalBudgetMinor != null && input.totalBudgetMinor !== "") {
    const r = validateAmountMinor(input.totalBudgetMinor, currency);
    if (!r.ok) return r;
    if (r.amountMinor <= 0) {
      return { ok: false, message: "Total budget must be greater than zero." };
    }
    if (r.amountMinor > MAX_BUDGET_MINOR) {
      return { ok: false, message: "Total budget exceeds the allowed maximum." };
    }
    total = r.amountMinor;
  }

  if (daily == null && total == null) {
    return { ok: false, message: "Provide a daily or total budget." };
  }
  if (daily != null && total != null && total < daily) {
    return {
      ok: false,
      message: "Total budget must be greater than or equal to daily budget.",
    };
  }

  return { ok: true, daily, total, currency };
}

export function validateCampaignDates(
  startAt: string | null | undefined,
  endAt: string | null | undefined
): { ok: true } | { ok: false; message: string } {
  if (!startAt && !endAt) return { ok: true };
  const start = startAt ? Date.parse(startAt) : null;
  const end = endAt ? Date.parse(endAt) : null;
  if (startAt && !Number.isFinite(start)) {
    return { ok: false, message: "Start date is invalid." };
  }
  if (endAt && !Number.isFinite(end)) {
    return { ok: false, message: "End date is invalid." };
  }
  if (start != null && end != null && end <= start) {
    return { ok: false, message: "End date must be after start date." };
  }
  return { ok: true };
}

export function validateTargeting(
  input: Partial<CampaignTargeting>
): { ok: true; targeting: CampaignTargeting } | { ok: false; message: string } {
  const ageMin = input.ageMin ?? MIN_TARGET_AGE;
  const ageMax = input.ageMax ?? MAX_TARGET_AGE;
  if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax)) {
    return { ok: false, message: "Age range must be whole numbers." };
  }
  if (ageMin < MIN_TARGET_AGE) {
    return {
      ok: false,
      message: `Minimum age cannot be below ${MIN_TARGET_AGE} (teen safety).`,
    };
  }
  if (ageMax > MAX_TARGET_AGE || ageMax < ageMin) {
    return { ok: false, message: "Age range is invalid." };
  }

  const countries = normalizeCodeList(input.countries, COUNTRY_RE);
  const excludeCountries = normalizeCodeList(input.excludeCountries, COUNTRY_RE);
  if (countries.invalid || excludeCountries.invalid) {
    return { ok: false, message: "Country codes must be ISO alpha-2." };
  }

  const languages = normalizeCodeList(input.languages ?? [], LANG_RE, true);
  if (languages.invalid) {
    return { ok: false, message: "Language codes are invalid." };
  }

  const interests = (input.interests ?? []).map((i) => i.trim().toLowerCase());
  for (const interest of interests) {
    if (!(SAFE_INTERESTS as readonly string[]).includes(interest)) {
      return {
        ok: false,
        message: `Interest “${interest}” is not allowed. Sensitive targeting is prohibited.`,
      };
    }
  }

  const segments = normalizeSegments(input.userSegments);
  if (!segments.ok) return segments;
  const excludeSegments = normalizeSegments(input.excludeUserSegments);
  if (!excludeSegments.ok) return excludeSegments;

  const interestBlob = [
    ...(input.interests ?? []),
    ...(input.excludeInterests ?? []),
    ...segments.values,
    ...excludeSegments.values,
  ]
    .join(" ")
    .toLowerCase();
  for (const attr of PROHIBITED_TARGETING_ATTRIBUTES) {
    if (interestBlob.includes(attr) || interestBlob.includes(attr.replace(/_/g, " "))) {
      return {
        ok: false,
        message: `Targeting attribute “${attr}” is prohibited.`,
      };
    }
  }

  const placements = (input.placements ?? []).filter((p): p is AdPlacement =>
    (AD_PLACEMENTS as readonly string[]).includes(p)
  );
  if (placements.length > 7) {
    return { ok: false, message: "Too many placements selected." };
  }

  // Include/exclude conflict
  if (countries.values.some((c) => excludeCountries.values.includes(c))) {
    return {
      ok: false,
      message: "A country cannot be both included and excluded.",
    };
  }

  const genderRaw = input.gender ?? "all";
  const allowedGender = ["all", "female", "male", "non_binary", null] as const;
  if (
    genderRaw != null &&
    !(allowedGender as readonly (string | null)[]).includes(genderRaw)
  ) {
    return { ok: false, message: "Gender targeting value is invalid." };
  }
  let gender: CampaignTargeting["gender"] = genderRaw;

  const regions = (input.regions ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 50);
  const cities = (input.cities ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 50);
  const excludeCities = (input.excludeCities ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 50);

  // Teen / minor safety: ages 13–17 cannot use precise geo/gender/segment targeting.
  const includesMinors = ageMin < 18;
  if (includesMinors) {
    if (gender != null && gender !== "all") {
      return {
        ok: false,
        message:
          "Gender targeting is not allowed when the audience includes ages 13–17.",
      };
    }
    if (cities.length > 0 || excludeCities.length > 0) {
      return {
        ok: false,
        message:
          "City-level targeting is not allowed when the audience includes ages 13–17.",
      };
    }
    if (segments.values.length > 0 || excludeSegments.values.length > 0) {
      return {
        ok: false,
        message:
          "User-segment targeting is not allowed when the audience includes ages 13–17.",
      };
    }
    gender = "all";
  }

  const targeting: CampaignTargeting = {
    countries: countries.values,
    regions,
    cities: includesMinors ? [] : cities,
    languages: languages.values,
    ageMin,
    ageMax,
    gender,
    interests,
    userSegments: includesMinors ? [] : segments.values,
    placements,
    devices: (input.devices ?? []).map((d) => d.trim().toLowerCase()).slice(0, 10),
    excludeCountries: excludeCountries.values,
    excludeRegions: (input.excludeRegions ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 50),
    excludeCities: includesMinors ? [] : excludeCities,
    excludeInterests: (input.excludeInterests ?? [])
      .map((i) => i.trim().toLowerCase())
      .filter((i) => (SAFE_INTERESTS as readonly string[]).includes(i)),
    excludeUserSegments: includesMinors ? [] : excludeSegments.values,
    frequencyCap:
      input.frequencyCap == null
        ? null
        : Number.isInteger(input.frequencyCap) &&
            input.frequencyCap >= 1 &&
            input.frequencyCap <= 100
          ? input.frequencyCap
          : null,
  };

  return { ok: true, targeting };
}

function normalizeSegments(
  values: string[] | undefined
): { ok: true; values: string[] } | { ok: false; message: string } {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const seg = raw.trim().toLowerCase();
    if (!seg) continue;
    if (
      PROHIBITED_TARGETING_ATTRIBUTES.some((p) => seg === p || seg.includes(p)) ||
      seg.startsWith("user:") ||
      seg.includes("@") ||
      /^\+?\d{7,}$/.test(seg) ||
      /^[0-9a-f-]{36}$/i.test(seg)
    ) {
      return {
        ok: false,
        message: "Individual user or sensitive segment targeting is not allowed.",
      };
    }
    if (!out.includes(seg)) out.push(seg);
  }
  return { ok: true, values: out.slice(0, 20) };
}

function normalizeCodeList(
  values: string[] | undefined,
  re: RegExp,
  keepCase = false
): { values: string[]; invalid: boolean } {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const v = keepCase ? raw.trim() : raw.trim().toUpperCase();
    if (!v) continue;
    if (!re.test(v)) return { values: [], invalid: true };
    if (!out.includes(v)) out.push(v);
  }
  return { values: out.slice(0, 50), invalid: false };
}

export function validateCreativeMediaPath(
  advertiserAccountId: string,
  userId: string,
  path: string
): boolean {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("..") || /\s/.test(trimmed)) return false;
  const prefix = `${advertiserAccountId}/${userId}/`;
  if (!trimmed.startsWith(prefix)) return false;
  const rest = trimmed.slice(prefix.length);
  return Boolean(rest) && !rest.includes("/");
}

export function validateCreativeFile(input: {
  mimeType: string;
  byteSize: number;
}): { ok: true } | { ok: false; message: string } {
  if (!(ALLOWED_CREATIVE_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    return { ok: false, message: "Creative must be JPEG, PNG, WebP, MP4, WebM, or MOV." };
  }
  if (input.byteSize <= 0 || input.byteSize > MAX_AD_CREATIVE_BYTES) {
    return { ok: false, message: "Creative file must be between 1 byte and 50 MB." };
  }
  return { ok: true };
}

/** Documented contract — not computed in V1. */
export function meetsMinimumAudienceContract(
  estimatedAudience: number | null | undefined
): boolean {
  if (estimatedAudience == null) return true;
  return estimatedAudience >= MIN_ESTIMATED_AUDIENCE;
}

export function isPlacement(value: string): value is AdPlacement {
  return (AD_PLACEMENTS as readonly string[]).includes(value);
}
