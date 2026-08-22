/**
 * About / Live Structure V1 (Creator Space Experience §9 + §13).
 * Readiness / presentation structure only — no live streaming system, no new backend.
 */

import type {
  ProfileAbout,
  ProfileLiveBucket,
  ProfileLivePreview,
  ProfileView,
} from "../types";

export const ABOUT_SECTION_ORDER = [
  "bio",
  "roles",
  "experience",
  "education",
  "specialtiesInterests",
  "achievements",
  "links",
  "joined",
] as const;

export type AboutSectionId = (typeof ABOUT_SECTION_ORDER)[number];

export const LIVE_BUCKET_ORDER = ["now", "upcoming", "past"] as const;

export type LiveBucketId = (typeof LIVE_BUCKET_ORDER)[number];

export const LIVE_BUCKET_LABELS: Record<LiveBucketId, string> = {
  now: "Live Now",
  upcoming: "Upcoming",
  past: "Past",
};

export type ProfileLiveBuckets = Record<LiveBucketId, ProfileLivePreview[]>;

export type AboutSectionVisibilityInput = {
  bio?: string | null;
  location?: string | null;
  joinedAt?: string | null;
  about: ProfileAbout;
};

/** Resolve session bucket from explicit field, then isLiveNow, then profile live flag. */
export function resolveProfileLiveBucket(
  session: ProfileLivePreview,
  profileIsLive: boolean
): ProfileLiveBucket {
  if (
    session.bucket === "now" ||
    session.bucket === "upcoming" ||
    session.bucket === "past"
  ) {
    return session.bucket;
  }
  if (session.isLiveNow === true) {
    return "now";
  }
  if (session.isLiveNow === false) {
    return "past";
  }
  return profileIsLive ? "now" : "past";
}

/** Split sessions into Now / Upcoming / Past. Empty buckets stay empty arrays. */
export function bucketProfileLiveSessions(
  sessions: readonly ProfileLivePreview[],
  profileIsLive: boolean
): ProfileLiveBuckets {
  const buckets: ProfileLiveBuckets = {
    now: [],
    upcoming: [],
    past: [],
  };

  for (const session of sessions) {
    buckets[resolveProfileLiveBucket(session, profileIsLive)].push(session);
  }

  return buckets;
}

/** Non-empty Live section ids only (skip empty Now/Upcoming/Past headers). */
export function getVisibleLiveBuckets(
  buckets: ProfileLiveBuckets
): LiveBucketId[] {
  return LIVE_BUCKET_ORDER.filter((id) => buckets[id].length > 0);
}

export function getAboutLocationLabel(
  profile: Pick<ProfileView, "city" | "country">
): string {
  return [profile.city, profile.country].filter(Boolean).join(", ");
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasItems(value: readonly unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * About sections that have content (empty sections omit entirely).
 * Joined is present when joinedLabel or joinedAt exists.
 */
export function getVisibleAboutSections(
  input: AboutSectionVisibilityInput
): AboutSectionId[] {
  const { about } = input;
  const location = input.location?.trim() || "";
  const hasLinks =
    hasText(about.website) || hasItems(about.links);

  return ABOUT_SECTION_ORDER.filter((id) => {
    switch (id) {
      case "bio":
        return hasText(input.bio) || hasText(location);
      case "roles":
        return hasItems(about.roles);
      case "experience":
        return hasItems(about.experience);
      case "education":
        return hasItems(about.education);
      case "specialtiesInterests":
        return hasItems(about.specialties) || hasItems(about.interests);
      case "achievements":
        return hasItems(about.achievements);
      case "links":
        return hasLinks;
      case "joined":
        return hasText(about.joinedLabel) || hasText(input.joinedAt);
      default:
        return false;
    }
  });
}
