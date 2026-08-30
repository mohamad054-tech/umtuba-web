import { createClient as createBrowserClient } from "./client";
import { getAuthenticatedUser } from "./auth";
import { getErrorMessage } from "./validation";
import {
  sanitizeHttpsUrl,
  validateBioLong,
  validateEducationDraft,
  validateLinkDraft,
  validateMilestoneDraft,
  validatePlaceDraft,
  validateTagDraft,
  validateWorkDraft,
  type EducationDraft,
  type LinkDraft,
  type MilestoneDraft,
  type PlaceDraft,
  type ProfileEducationType,
  type ProfileMilestoneCategory,
  type ProfilePlaceKind,
  type ProfileTagKind,
  type ProfileVisibility,
  type ProfileWorkKind,
  type TagDraft,
  type WorkDraft,
} from "../profile/richProfileContract";

type QueryClient = {
  from: (table: string) => any;
};

export type ProfilePlaceRow = {
  id: string;
  profile_id: string;
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
  created_at: string;
  updated_at: string;
};

export type ProfileEducationRow = {
  id: string;
  profile_id: string;
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
  created_at: string;
  updated_at: string;
};

export type ProfileWorkRow = {
  id: string;
  profile_id: string;
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
  created_at: string;
  updated_at: string;
};

export type ProfileTagRow = {
  id: string;
  profile_id: string;
  kind: ProfileTagKind;
  label: string;
  sort_order: number;
  visibility: ProfileVisibility;
  created_at: string;
};

export type ProfileMilestoneRow = {
  id: string;
  profile_id: string;
  category: ProfileMilestoneCategory;
  title: string;
  description: string | null;
  occurred_on: string | null;
  occurred_year: number | null;
  location_label: string | null;
  external_url: string | null;
  sort_order: number;
  visibility: ProfileVisibility;
  created_at: string;
  updated_at: string;
};

export type ProfileLinkRow = {
  id: string;
  profile_id: string;
  label: string;
  url: string;
  sort_order: number;
  visibility: ProfileVisibility;
  created_at: string;
  updated_at: string;
};

export type RichProfileBundle = {
  places: ProfilePlaceRow[];
  education: ProfileEducationRow[];
  work: ProfileWorkRow[];
  tags: ProfileTagRow[];
  milestones: ProfileMilestoneRow[];
  links: ProfileLinkRow[];
  loadFailed: boolean;
};

export const EMPTY_RICH_PROFILE_BUNDLE: RichProfileBundle = {
  places: [],
  education: [],
  work: [],
  tags: [],
  milestones: [],
  links: [],
  loadFailed: false,
};

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

async function selectOwnedRows<T>(
  supabase: QueryClient,
  table: string,
  columns: string,
  profileId: string
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(getErrorMessage(error, "Unable to load profile details."));
  }

  return (data as T[]) ?? [];
}

const PLACE_COLUMNS =
  "id, profile_id, place_kind, label, city, region, country, start_year, end_year, is_current, description, sort_order, visibility, created_at, updated_at";
const EDUCATION_COLUMNS =
  "id, profile_id, institution, education_type, field_of_study, credential, location_label, start_year, end_year, is_current, description, external_url, sort_order, visibility, created_at, updated_at";
const WORK_COLUMNS =
  "id, profile_id, work_kind, organization, title, location_label, start_year, end_year, is_current, description, external_url, sort_order, visibility, created_at, updated_at";
const TAG_COLUMNS =
  "id, profile_id, kind, label, sort_order, visibility, created_at";
const MILESTONE_COLUMNS =
  "id, profile_id, category, title, description, occurred_on, occurred_year, location_label, external_url, sort_order, visibility, created_at, updated_at";
const LINK_COLUMNS =
  "id, profile_id, label, url, sort_order, visibility, created_at, updated_at";

export async function loadRichProfileBundle(
  supabase: QueryClient,
  profileId: string
): Promise<RichProfileBundle> {
  if (!profileId) return { ...EMPTY_RICH_PROFILE_BUNDLE };

  try {
    const [places, education, work, tags, milestones, links] =
      await Promise.all([
        selectOwnedRows<ProfilePlaceRow>(
          supabase,
          "profile_places",
          PLACE_COLUMNS,
          profileId
        ),
        selectOwnedRows<ProfileEducationRow>(
          supabase,
          "profile_education",
          EDUCATION_COLUMNS,
          profileId
        ),
        selectOwnedRows<ProfileWorkRow>(
          supabase,
          "profile_work",
          WORK_COLUMNS,
          profileId
        ),
        selectOwnedRows<ProfileTagRow>(
          supabase,
          "profile_tags",
          TAG_COLUMNS,
          profileId
        ),
        selectOwnedRows<ProfileMilestoneRow>(
          supabase,
          "profile_milestones",
          MILESTONE_COLUMNS,
          profileId
        ),
        selectOwnedRows<ProfileLinkRow>(
          supabase,
          "profile_links",
          LINK_COLUMNS,
          profileId
        ),
      ]);

    return {
      places,
      education,
      work,
      tags,
      milestones,
      links,
      loadFailed: false,
    };
  } catch {
    return { ...EMPTY_RICH_PROFILE_BUNDLE, loadFailed: true };
  }
}

async function requireOwnerClient() {
  const supabase = createBrowserClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Please sign in to edit your profile.");
  }
  return { supabase, user };
}

async function insertRow<T>(
  table: string,
  payload: Record<string, unknown>,
  columns: string
): Promise<T> {
  const { supabase, user } = await requireOwnerClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, profile_id: user.id })
    .select(columns)
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to save this profile item."));
  }
  return data as T;
}

async function updateRow<T>(
  table: string,
  id: string,
  payload: Record<string, unknown>,
  columns: string
): Promise<T> {
  const { supabase, user } = await requireOwnerClient();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select(columns)
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to update this profile item."));
  }
  return data as T;
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { supabase, user } = await requireOwnerClient();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to remove this profile item."));
  }
}

export async function createProfilePlace(
  draft: PlaceDraft
): Promise<ProfilePlaceRow> {
  const parsed = validatePlaceDraft(draft);
  if (!parsed.ok) throw new Error("Please check this place.");
  return insertRow("profile_places", parsed.value, PLACE_COLUMNS);
}

export async function updateProfilePlace(
  id: string,
  draft: PlaceDraft
): Promise<ProfilePlaceRow> {
  const parsed = validatePlaceDraft(draft);
  if (!parsed.ok) throw new Error("Please check this place.");
  return updateRow("profile_places", id, parsed.value, PLACE_COLUMNS);
}

export async function deleteProfilePlace(id: string): Promise<void> {
  return deleteRow("profile_places", id);
}

export async function createProfileEducation(
  draft: EducationDraft
): Promise<ProfileEducationRow> {
  const parsed = validateEducationDraft(draft);
  if (!parsed.ok) throw new Error("Please check this education record.");
  return insertRow("profile_education", parsed.value, EDUCATION_COLUMNS);
}

export async function updateProfileEducation(
  id: string,
  draft: EducationDraft
): Promise<ProfileEducationRow> {
  const parsed = validateEducationDraft(draft);
  if (!parsed.ok) throw new Error("Please check this education record.");
  return updateRow("profile_education", id, parsed.value, EDUCATION_COLUMNS);
}

export async function deleteProfileEducation(id: string): Promise<void> {
  return deleteRow("profile_education", id);
}

export async function createProfileWork(
  draft: WorkDraft
): Promise<ProfileWorkRow> {
  const parsed = validateWorkDraft(draft);
  if (!parsed.ok) throw new Error("Please check this work record.");
  return insertRow("profile_work", parsed.value, WORK_COLUMNS);
}

export async function updateProfileWork(
  id: string,
  draft: WorkDraft
): Promise<ProfileWorkRow> {
  const parsed = validateWorkDraft(draft);
  if (!parsed.ok) throw new Error("Please check this work record.");
  return updateRow("profile_work", id, parsed.value, WORK_COLUMNS);
}

export async function deleteProfileWork(id: string): Promise<void> {
  return deleteRow("profile_work", id);
}

export async function createProfileTag(draft: TagDraft): Promise<ProfileTagRow> {
  const parsed = validateTagDraft(draft);
  if (!parsed.ok) throw new Error("Please check this tag.");
  return insertRow("profile_tags", parsed.value, TAG_COLUMNS);
}

export async function deleteProfileTag(id: string): Promise<void> {
  return deleteRow("profile_tags", id);
}

export async function reorderProfileTag(
  id: string,
  sortOrder: number
): Promise<ProfileTagRow> {
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Invalid sort order.");
  }
  return updateRow("profile_tags", id, { sort_order: sortOrder }, TAG_COLUMNS);
}

export async function createProfileMilestone(
  draft: MilestoneDraft
): Promise<ProfileMilestoneRow> {
  const parsed = validateMilestoneDraft(draft);
  if (!parsed.ok) throw new Error("Please check this milestone.");
  return insertRow("profile_milestones", parsed.value, MILESTONE_COLUMNS);
}

export async function updateProfileMilestone(
  id: string,
  draft: MilestoneDraft
): Promise<ProfileMilestoneRow> {
  const parsed = validateMilestoneDraft(draft);
  if (!parsed.ok) throw new Error("Please check this milestone.");
  return updateRow("profile_milestones", id, parsed.value, MILESTONE_COLUMNS);
}

export async function deleteProfileMilestone(id: string): Promise<void> {
  return deleteRow("profile_milestones", id);
}

export async function createProfileLink(
  draft: LinkDraft
): Promise<ProfileLinkRow> {
  const parsed = validateLinkDraft(draft);
  if (!parsed.ok) throw new Error("Please check this link.");
  return insertRow("profile_links", parsed.value, LINK_COLUMNS);
}

export async function updateProfileLink(
  id: string,
  draft: LinkDraft
): Promise<ProfileLinkRow> {
  const parsed = validateLinkDraft(draft);
  if (!parsed.ok) throw new Error("Please check this link.");
  return updateRow("profile_links", id, parsed.value, LINK_COLUMNS);
}

export async function deleteProfileLink(id: string): Promise<void> {
  return deleteRow("profile_links", id);
}

export async function reorderProfilePlace(
  id: string,
  sortOrder: number
): Promise<ProfilePlaceRow> {
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Invalid sort order.");
  }
  return updateRow(
    "profile_places",
    id,
    { sort_order: sortOrder },
    PLACE_COLUMNS
  );
}

export function sanitizeWebsiteUrl(value: unknown): string | null {
  if (value == null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  return sanitizeHttpsUrl(value);
}

export function sanitizeLongBio(value: unknown): string | null {
  return validateBioLong(value);
}

export function formatYearRange(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
  isCurrent: boolean,
  presentLabel: string
): string {
  const start = startYear ? String(startYear) : "";
  const end = isCurrent ? presentLabel : endYear ? String(endYear) : "";
  if (start && end) return `${start}–${end}`;
  if (start) return isCurrent ? `${start}–${presentLabel}` : start;
  if (end) return end;
  return "";
}

export function formatPlaceLine(place: Pick<
  ProfilePlaceRow,
  "city" | "region" | "country" | "label"
>): string {
  const parts = [place.city, place.region, place.country]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return place.label.trim();
}

export function currentWorkTitle(work: readonly ProfileWorkRow[]): string {
  const current = work.find((row) => row.is_current) ?? work[0];
  if (!current) return "";
  if (current.organization?.trim()) {
    return `${current.title.trim()} · ${current.organization.trim()}`;
  }
  return current.title.trim();
}

export function compactLocationFromRich(input: {
  city?: string;
  country?: string;
  places?: readonly ProfilePlaceRow[];
}): string {
  const current = input.places?.find(
    (place) => place.place_kind === "current_city" || place.is_current
  );
  if (current) return formatPlaceLine(current);
  const hometown = input.places?.find((place) => place.place_kind === "hometown");
  if (hometown) return formatPlaceLine(hometown);
  return [input.city?.trim(), input.country?.trim()].filter(Boolean).join(", ");
}
