/**
 * Creator Hub tab model (Creator Space Experience V1 §5).
 * Deep-link: `?tab=` accepts known ids; legacy `posts` → `photos`; unknown → `all`.
 */

export type ProfileTabId =
  | "all"
  | "articles"
  | "videos"
  | "courses"
  | "products"
  | "photos"
  | "live"
  | "about";

/** Canonical order. Live is inserted only when visible. */
export const PROFILE_TAB_ORDER: readonly ProfileTabId[] = [
  "all",
  "articles",
  "videos",
  "courses",
  "products",
  "photos",
  "live",
  "about",
] as const;

export const PROFILE_TAB_LABELS: Record<ProfileTabId, string> = {
  all: "All",
  articles: "Articles",
  videos: "Videos",
  courses: "Courses",
  products: "Products",
  photos: "Photos",
  live: "Live",
  about: "About",
};

const KNOWN_TAB_IDS = new Set<string>(PROFILE_TAB_ORDER);

export type ProfileTabVisibilityInput = {
  isOwner: boolean;
  articleCount: number;
  videoCount: number;
  /** Stub readiness — 0 until Courses catalog projection exists. */
  courseCount: number;
  /** Stub readiness — 0 until Products catalog projection exists. */
  productCount: number;
  photoCount: number;
  /** Existing Live conditional (sessions or isLive). */
  showLiveTab: boolean;
};

/**
 * Visibility (Creator Space §5):
 * - Always: All, About
 * - Articles / Videos / Courses / Products / Photos: count > 0 OR owner
 * - Live: keep existing conditional (`showLiveTab`)
 */
export function getVisibleProfileTabs(
  input: ProfileTabVisibilityInput
): ProfileTabId[] {
  const {
    isOwner,
    articleCount,
    videoCount,
    courseCount,
    productCount,
    photoCount,
    showLiveTab,
  } = input;

  return PROFILE_TAB_ORDER.filter((id) => {
    switch (id) {
      case "all":
      case "about":
        return true;
      case "articles":
        return isOwner || articleCount > 0;
      case "videos":
        return isOwner || videoCount > 0;
      case "courses":
        return isOwner || courseCount > 0;
      case "products":
        return isOwner || productCount > 0;
      case "photos":
        return isOwner || photoCount > 0;
      case "live":
        return showLiveTab;
      default:
        return false;
    }
  });
}

/** Parse `?tab=` — legacy `posts` maps to `photos`; unknown → `all`. */
export function parseProfileTab(raw: string | null): ProfileTabId {
  if (raw === "posts") {
    return "photos";
  }
  if (raw && KNOWN_TAB_IDS.has(raw)) {
    return raw as ProfileTabId;
  }
  return "all";
}

/** Prefer requested tab when visible; otherwise All. */
export function resolveActiveProfileTab(
  raw: string | null,
  visible: readonly ProfileTabId[]
): ProfileTabId {
  const parsed = parseProfileTab(raw);
  return visible.includes(parsed) ? parsed : "all";
}

/** Image-first Photos count — text-only posts do not count. */
export function countProfilePhotos(
  posts: readonly { imageUrl: string | null; postType?: string }[]
): number {
  return posts.filter(
    (post) =>
      Boolean(post.imageUrl?.trim()) ||
      post.postType === "image"
  ).length;
}
