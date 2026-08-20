/**
 * Creator Space Empty States V1 (CREATOR_SPACE_EXPERIENCE_V1 §18).
 * Visitor vs owner empty copy for All / Videos — no migrations / Home edits.
 */

export const PROFILE_EMPTY_STATES_COPY = {
  allTitle: "No published content yet.",
  allVisitorDescription:
    "Articles and independent videos will appear here in one timeline.",
  allOwnerDescription:
    "Publish an article or upload a video to start your Creator Space timeline.",
  writeArticleCta: "Write article",
  uploadVideoCta: "Upload video",
  videosTitle: "No published videos yet",
  videosVisitorDescription: "This creator has not published videos yet.",
  videosOwnerDescription:
    "Upload a clip to show it on this Creator Space and on Discover.",
  openDiscoverCta: "Open Discover",
} as const;

export function shouldShowOwnerEmptyCreateActions(isOwner: boolean): boolean {
  return Boolean(isOwner);
}
