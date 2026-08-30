/**
 * Personal-identity helpers for the public profile (Part 2A).
 * Reuses existing view-model fields only — no new tables or columns.
 */

import type { TranslationKey } from "../../../lib/i18n/messages/types";
import type { ProfileView } from "../types";

export const PROFILE_IDENTITY_ROLES = ["creator", "teacher", "seller"] as const;

export type ProfileIdentityRole = (typeof PROFILE_IDENTITY_ROLES)[number];

export const PROFILE_ROLE_LABEL_KEY: Record<ProfileIdentityRole, TranslationKey> =
  {
    creator: "profile.role.creator",
    teacher: "profile.role.teacher",
    seller: "profile.role.seller",
  };

export type ProfileIdentityCounts = {
  videoCount: number;
  articleCount: number;
  photoCount: number;
  postCount?: number;
  courseCount: number;
  productCount: number;
  isLive?: boolean;
};

/** Role chips only when the person already has that public activity. */
export function resolveProfileIdentityRoles(
  input: ProfileIdentityCounts
): ProfileIdentityRole[] {
  const roles: ProfileIdentityRole[] = [];

  if (
    input.videoCount > 0 ||
    input.articleCount > 0 ||
    input.photoCount > 0 ||
    (input.postCount ?? 0) > 0 ||
    Boolean(input.isLive)
  ) {
    roles.push("creator");
  }

  if (input.courseCount > 0) {
    roles.push("teacher");
  }

  if (input.productCount > 0) {
    roles.push("seller");
  }

  return roles;
}

export function getProfilePlaces(
  profile: Pick<ProfileView, "city" | "country" | "rich">
): {
  city: string;
  country: string;
  hasPlaces: boolean;
} {
  const city = profile.city.trim();
  const country = profile.country.trim();
  const richPlaces = profile.rich?.places ?? [];
  return {
    city,
    country,
    hasPlaces: Boolean(city || country || richPlaces.length > 0),
  };
}

/** Strip a leading "Joined " so locale-aware copy can wrap the date. */
export function stripJoinedPrefix(label: string | null | undefined): string {
  return (label ?? "").replace(/^joined\s+/i, "").trim();
}

export function hasPersonalIntroContent(
  profile: Pick<ProfileView, "bio" | "bioLong" | "city" | "country" | "about" | "rich">
): boolean {
  const places = getProfilePlaces(profile);
  return Boolean(
    profile.bio.trim() ||
      profile.bioLong?.trim() ||
      places.hasPlaces ||
      stripJoinedPrefix(profile.about.joinedLabel)
  );
}

export type AboutInternalNavId =
  | "overview"
  | "places"
  | "experience"
  | "education"
  | "specialtiesInterests"
  | "achievements"
  | "milestones"
  | "links";

export const ABOUT_INTERNAL_NAV_ORDER: readonly AboutInternalNavId[] = [
  "overview",
  "places",
  "experience",
  "education",
  "specialtiesInterests",
  "achievements",
  "milestones",
  "links",
] as const;

export const ABOUT_INTERNAL_NAV_KEY: Record<AboutInternalNavId, TranslationKey> =
  {
    overview: "profile.about.overview",
    places: "profile.about.places",
    experience: "profile.about.experience",
    education: "profile.about.education",
    specialtiesInterests: "profile.about.specialties",
    achievements: "profile.about.achievements",
    milestones: "profile.about.milestones",
    links: "profile.about.links",
  };

function hasItems(value: readonly unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** In-About section chips — Overview always; others only when content exists. */
export function getAboutInternalNav(
  profile: ProfileView,
  options?: { includeUmtubaAchievement?: boolean }
): AboutInternalNavId[] {
  const places = getProfilePlaces(profile);
  const about = profile.about;
  const rich = profile.rich;
  const showAchievements =
    hasItems(about.achievements) ||
    Boolean(options?.includeUmtubaAchievement) ||
    Boolean(rich?.milestones.some((item) => item.category === "achievement"));
  const otherMilestones =
    rich?.milestones.filter((item) => item.category !== "achievement") ?? [];

  return ABOUT_INTERNAL_NAV_ORDER.filter((id) => {
    switch (id) {
      case "overview":
        return true;
      case "places":
        return places.hasPlaces;
      case "experience":
        return hasItems(about.experience) || hasItems(rich?.work);
      case "education":
        return hasItems(about.education) || hasItems(rich?.education);
      case "specialtiesInterests":
        return hasItems(about.specialties) || hasItems(about.interests) || hasItems(rich?.tags);
      case "achievements":
        return showAchievements;
      case "milestones":
        return otherMilestones.length > 0;
      case "links":
        return Boolean(about.website?.trim()) || hasItems(about.links) || hasItems(rich?.links);
      default:
        return false;
    }
  });
}
