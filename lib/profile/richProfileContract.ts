export const PROFILE_VISIBILITY = [
  "public",
  "followers",
  "connections",
  "only_me",
] as const;

export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

export const PROFILE_PLACE_KINDS = [
  "birthplace",
  "hometown",
  "current_city",
  "previous_city",
  "other",
] as const;

export type ProfilePlaceKind = (typeof PROFILE_PLACE_KINDS)[number];

export const PROFILE_EDUCATION_TYPES = [
  "primary",
  "secondary",
  "undergraduate",
  "graduate",
  "vocational",
  "certificate",
  "other",
] as const;

export type ProfileEducationType = (typeof PROFILE_EDUCATION_TYPES)[number];

export const PROFILE_WORK_KINDS = [
  "employed",
  "owner",
  "freelance",
  "creator",
  "teacher",
  "seller",
  "student",
  "independent",
  "other",
] as const;

export type ProfileWorkKind = (typeof PROFILE_WORK_KINDS)[number];

export const PROFILE_TAG_KINDS = [
  "interest",
  "skill",
  "language",
  "hobby",
] as const;

export type ProfileTagKind = (typeof PROFILE_TAG_KINDS)[number];

export const PROFILE_MILESTONE_CATEGORIES = [
  "education",
  "career",
  "creator",
  "teacher",
  "seller",
  "business",
  "achievement",
  "move",
  "project",
  "certification",
  "other",
] as const;

export type ProfileMilestoneCategory =
  (typeof PROFILE_MILESTONE_CATEGORIES)[number];

export const FORBIDDEN_MILESTONE_CATEGORIES = [
  "health",
  "medical",
  "criminal",
  "legal",
  "financial",
  "government",
  "political",
  "religion",
] as const;

export const PROFILE_YEAR_MIN = 1800;
export const PROFILE_YEAR_MAX = 2100;
export const PROFILE_BIO_LONG_MAX = 4000;
export const PROFILE_URL_MAX = 500;

export type ContractIssue = { field: string; reason: string };

function trimToNull(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function requireTrimmed(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > max) return null;
  return trimmed;
}

export function isProfileVisibility(value: unknown): value is ProfileVisibility {
  return (
    typeof value === "string" &&
    (PROFILE_VISIBILITY as readonly string[]).includes(value)
  );
}

export function normalizeProfileVisibility(
  value: unknown
): ProfileVisibility {
  return isProfileVisibility(value) ? value : "public";
}

export function sanitizeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > PROFILE_URL_MAX) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return null;

  const withScheme = /^https:\/\//i.test(raw)
    ? raw
    : /^https?:\/\//i.test(raw)
      ? null
      : `https://${raw}`;

  if (!withScheme) return null;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname || parsed.hostname.includes(" ")) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseOptionalYear(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const year =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(year)) return null;
  if (year < PROFILE_YEAR_MIN || year > PROFILE_YEAR_MAX) return null;
  return year;
}

export function yearsAreOrdered(
  startYear: number | null,
  endYear: number | null
): boolean {
  if (startYear == null || endYear == null) return true;
  return endYear >= startYear;
}

export function normalizeTagLabel(value: unknown): string | null {
  return requireTrimmed(value, 80);
}

export function tagDuplicateKey(kind: ProfileTagKind, label: string): string {
  return `${kind}:${label.trim().toLowerCase()}`;
}

export type PlaceDraft = {
  placeKind: unknown;
  label: unknown;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  isCurrent?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

export type EducationDraft = {
  institution: unknown;
  educationType?: unknown;
  fieldOfStudy?: unknown;
  credential?: unknown;
  locationLabel?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  isCurrent?: unknown;
  description?: unknown;
  externalUrl?: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

export type WorkDraft = {
  workKind?: unknown;
  organization?: unknown;
  title: unknown;
  locationLabel?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  isCurrent?: unknown;
  description?: unknown;
  externalUrl?: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

export type TagDraft = {
  kind: unknown;
  label: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

export type MilestoneDraft = {
  category: unknown;
  title: unknown;
  description?: unknown;
  occurredOn?: unknown;
  occurredYear?: unknown;
  locationLabel?: unknown;
  externalUrl?: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

export type LinkDraft = {
  label: unknown;
  url: unknown;
  sortOrder?: unknown;
  visibility?: unknown;
};

function parseSortOrder(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < 0) return -1;
  return n;
}

function optionalHttps(value: unknown): string | null | undefined {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  return sanitizeHttpsUrl(value) ?? undefined;
}

export function validatePlaceDraft(draft: PlaceDraft): {
  ok: true;
  value: {
    place_kind: ProfilePlaceKind;
    label: string;
    city: string | null;
    region: string | null;
    country: string | null;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
    description: string | null;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const placeKind = (PROFILE_PLACE_KINDS as readonly string[]).includes(
    String(draft.placeKind)
  )
    ? (draft.placeKind as ProfilePlaceKind)
    : null;
  if (!placeKind) issues.push({ field: "placeKind", reason: "invalid" });

  const label = requireTrimmed(draft.label, 120);
  if (!label) issues.push({ field: "label", reason: "required" });

  const city = trimToNull(draft.city, 80);
  const region = trimToNull(draft.region, 80);
  const country = trimToNull(draft.country, 80);
  if (draft.city && !city && String(draft.city).trim()) {
    issues.push({ field: "city", reason: "invalid" });
  }
  const startYear = parseOptionalYear(draft.startYear);
  const endYear = parseOptionalYear(draft.endYear);
  if (draft.startYear != null && draft.startYear !== "" && startYear == null) {
    issues.push({ field: "startYear", reason: "invalid" });
  }
  if (draft.endYear != null && draft.endYear !== "" && endYear == null) {
    issues.push({ field: "endYear", reason: "invalid" });
  }
  if (!yearsAreOrdered(startYear, endYear)) {
    issues.push({ field: "endYear", reason: "order" });
  }
  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !placeKind || !label) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      place_kind: placeKind,
      label,
      city,
      region,
      country,
      start_year: startYear,
      end_year: endYear,
      is_current: Boolean(draft.isCurrent),
      description: trimToNull(draft.description, 500),
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateEducationDraft(draft: EducationDraft): {
  ok: true;
  value: {
    institution: string;
    education_type: ProfileEducationType;
    field_of_study: string | null;
    credential: string | null;
    location_label: string | null;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
    description: string | null;
    external_url: string | null;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const institution = requireTrimmed(draft.institution, 200);
  if (!institution) issues.push({ field: "institution", reason: "required" });

  const educationType = (PROFILE_EDUCATION_TYPES as readonly string[]).includes(
    String(draft.educationType ?? "other")
  )
    ? ((draft.educationType ?? "other") as ProfileEducationType)
    : null;
  if (!educationType) issues.push({ field: "educationType", reason: "invalid" });

  const startYear = parseOptionalYear(draft.startYear);
  const endYear = parseOptionalYear(draft.endYear);
  if (draft.startYear != null && draft.startYear !== "" && startYear == null) {
    issues.push({ field: "startYear", reason: "invalid" });
  }
  if (draft.endYear != null && draft.endYear !== "" && endYear == null) {
    issues.push({ field: "endYear", reason: "invalid" });
  }
  if (!yearsAreOrdered(startYear, endYear)) {
    issues.push({ field: "endYear", reason: "order" });
  }

  const url = optionalHttps(draft.externalUrl);
  if (url === undefined) issues.push({ field: "externalUrl", reason: "invalid" });

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !institution || !educationType) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      institution,
      education_type: educationType,
      field_of_study: trimToNull(draft.fieldOfStudy, 160),
      credential: trimToNull(draft.credential, 160),
      location_label: trimToNull(draft.locationLabel, 160),
      start_year: startYear,
      end_year: endYear,
      is_current: Boolean(draft.isCurrent),
      description: trimToNull(draft.description, 1000),
      external_url: url ?? null,
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateWorkDraft(draft: WorkDraft): {
  ok: true;
  value: {
    work_kind: ProfileWorkKind;
    organization: string | null;
    title: string;
    location_label: string | null;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
    description: string | null;
    external_url: string | null;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const title = requireTrimmed(draft.title, 160);
  if (!title) issues.push({ field: "title", reason: "required" });

  const workKind = (PROFILE_WORK_KINDS as readonly string[]).includes(
    String(draft.workKind ?? "other")
  )
    ? ((draft.workKind ?? "other") as ProfileWorkKind)
    : null;
  if (!workKind) issues.push({ field: "workKind", reason: "invalid" });

  const startYear = parseOptionalYear(draft.startYear);
  const endYear = parseOptionalYear(draft.endYear);
  if (draft.startYear != null && draft.startYear !== "" && startYear == null) {
    issues.push({ field: "startYear", reason: "invalid" });
  }
  if (draft.endYear != null && draft.endYear !== "" && endYear == null) {
    issues.push({ field: "endYear", reason: "invalid" });
  }
  if (!yearsAreOrdered(startYear, endYear)) {
    issues.push({ field: "endYear", reason: "order" });
  }

  const url = optionalHttps(draft.externalUrl);
  if (url === undefined) issues.push({ field: "externalUrl", reason: "invalid" });

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !title || !workKind) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      work_kind: workKind,
      organization: trimToNull(draft.organization, 160),
      title,
      location_label: trimToNull(draft.locationLabel, 160),
      start_year: startYear,
      end_year: endYear,
      is_current: Boolean(draft.isCurrent),
      description: trimToNull(draft.description, 1000),
      external_url: url ?? null,
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateTagDraft(draft: TagDraft): {
  ok: true;
  value: {
    kind: ProfileTagKind;
    label: string;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const kind = (PROFILE_TAG_KINDS as readonly string[]).includes(String(draft.kind))
    ? (draft.kind as ProfileTagKind)
    : null;
  if (!kind) issues.push({ field: "kind", reason: "invalid" });

  const label = normalizeTagLabel(draft.label);
  if (!label) issues.push({ field: "label", reason: "required" });

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !kind || !label) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      kind,
      label,
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateMilestoneDraft(draft: MilestoneDraft): {
  ok: true;
  value: {
    category: ProfileMilestoneCategory;
    title: string;
    description: string | null;
    occurred_on: string | null;
    occurred_year: number | null;
    location_label: string | null;
    external_url: string | null;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const categoryRaw = String(draft.category ?? "");
  if (
    (FORBIDDEN_MILESTONE_CATEGORIES as readonly string[]).includes(categoryRaw)
  ) {
    issues.push({ field: "category", reason: "forbidden" });
  }
  const category = (PROFILE_MILESTONE_CATEGORIES as readonly string[]).includes(
    categoryRaw
  )
    ? (draft.category as ProfileMilestoneCategory)
    : null;
  if (!category) issues.push({ field: "category", reason: "invalid" });

  const title = requireTrimmed(draft.title, 160);
  if (!title) issues.push({ field: "title", reason: "required" });

  let occurredOn: string | null = null;
  if (typeof draft.occurredOn === "string" && draft.occurredOn.trim()) {
    const date = draft.occurredOn.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      issues.push({ field: "occurredOn", reason: "invalid" });
    } else {
      occurredOn = date;
    }
  }

  const occurredYear = parseOptionalYear(draft.occurredYear);
  if (
    draft.occurredYear != null &&
    draft.occurredYear !== "" &&
    occurredYear == null
  ) {
    issues.push({ field: "occurredYear", reason: "invalid" });
  }

  const url = optionalHttps(draft.externalUrl);
  if (url === undefined) issues.push({ field: "externalUrl", reason: "invalid" });

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !category || !title) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      category,
      title,
      description: trimToNull(draft.description, 1000),
      occurred_on: occurredOn,
      occurred_year: occurredYear,
      location_label: trimToNull(draft.locationLabel, 160),
      external_url: url ?? null,
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateLinkDraft(draft: LinkDraft): {
  ok: true;
  value: {
    label: string;
    url: string;
    sort_order: number;
    visibility: ProfileVisibility;
  };
} | { ok: false; issues: ContractIssue[] } {
  const issues: ContractIssue[] = [];
  const label = requireTrimmed(draft.label, 80);
  if (!label) issues.push({ field: "label", reason: "required" });

  const url = sanitizeHttpsUrl(draft.url);
  if (!url) issues.push({ field: "url", reason: "invalid" });

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder < 0) issues.push({ field: "sortOrder", reason: "invalid" });

  if (issues.length > 0 || !label || !url) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      label,
      url,
      sort_order: sortOrder,
      visibility: normalizeProfileVisibility(draft.visibility),
    },
  };
}

export function validateBioLong(value: unknown): string | null {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > PROFILE_BIO_LONG_MAX) return null;
  return trimmed;
}

export function connectionsIsOwnerOnly(visibility: ProfileVisibility): boolean {
  return visibility === "connections" || visibility === "only_me";
}
