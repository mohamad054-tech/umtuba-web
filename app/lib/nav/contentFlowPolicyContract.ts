/**
 * Platform Navigation Content-flow Policy Decision V1
 *
 * Architectural policy only — **no Home / CTA / route behavior changes** in this phase.
 *
 * Preferred Flow (platform intent):
 *   Home (Discovery) → Creator Space (`/profile/[username]`, optional `?article=`) → Content Destination
 *
 * Allowed Shortcuts (temporary, not a policy breach):
 *   Direct Home → Content (e.g. article CTA / deep links) may remain until a separate
 *   Product GO lifts the Home lock and authorizes funnel changes.
 *
 * Classification:
 * - Home `/` = Discovery Layer
 * - `/profile/[username]` = Creator Hub
 * - Full content surfaces (article, watch focus, etc.) = Destinations
 *
 * Changing Home article funnel / CTAs requires:
 * 1. Separate Product GO
 * 2. Explicit Home unlock
 *
 * Do not invent new redirects. Do not change `buildPostNotificationHref`.
 *
 * @see docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md §2.8
 * @see docs/architecture/UNIFIED_EXPERIENCE_PAGE_CONSOLIDATION_V1.md §15
 */

import { APP_ROUTES, buildCreatorProfileHref, buildPostNotificationHref } from "./routes";

export const CONTENT_FLOW_PREFERRED_STEPS = [
  "home-discovery",
  "creator-space",
  "content-destination",
] as const;

export type ContentFlowPreferredStep = (typeof CONTENT_FLOW_PREFERRED_STEPS)[number];

export const CONTENT_FLOW_SURFACE_ROLES = {
  home: "discovery-layer",
  creatorSpace: "creator-hub",
  fullContent: "destination",
} as const;

/** Canonical path contracts for classification (no route renames). */
export const CONTENT_FLOW_PATHS = {
  home: APP_ROUTES.home,
  discoverAlias: APP_ROUTES.discover,
  profileIndex: APP_ROUTES.profile,
  watch: APP_ROUTES.watch,
  articlesPrefix: "/articles/",
} as const;

/**
 * Documented allowed shortcuts that may skip Creator Space today.
 * Presence is expected; removal/rewire needs Product GO + Home unlock.
 */
export const CONTENT_FLOW_ALLOWED_SHORTCUTS = [
  {
    id: "home-direct-article",
    from: "home-discovery",
    to: "content-destination",
    note: "Home may deep-link or CTA directly to `/articles/[id]` today.",
  },
  {
    id: "discover-post-notification",
    from: "notification",
    to: "home-discovery",
    note: "`buildPostNotificationHref` → `/discover?post=` (Home alias); unchanged this phase.",
  },
  {
    id: "watch-post-deep-link",
    from: "deep-link",
    to: "content-destination",
    note: "`/watch?post=` remains an independent destination entry.",
  },
] as const;

export function buildPreferredCreatorSpaceArticleHref(input: {
  username: string;
  articleId: string;
}): string {
  return buildCreatorProfileHref({
    username: input.username,
    articleId: input.articleId,
  });
}

export function assertContentFlowPolicyDecision(): void {
  if (CONTENT_FLOW_SURFACE_ROLES.home !== "discovery-layer") {
    throw new Error("Home must remain Discovery Layer under content-flow policy");
  }
  if (CONTENT_FLOW_SURFACE_ROLES.creatorSpace !== "creator-hub") {
    throw new Error("Creator Space must remain Creator Hub under content-flow policy");
  }
  if (CONTENT_FLOW_SURFACE_ROLES.fullContent !== "destination") {
    throw new Error("Full content must remain Destination under content-flow policy");
  }

  // Preferred builders stay available; notification deep link must not be rewritten here.
  const samplePreferred = buildPreferredCreatorSpaceArticleHref({
    username: "policy_user",
    articleId: "11111111-1111-4111-8111-111111111111",
  });
  if (!samplePreferred.startsWith("/profile/policy_user?article=")) {
    throw new Error("Preferred Creator Space article href drifted");
  }

  const notification = buildPostNotificationHref({ postId: "42" });
  if (notification !== "/discover?post=42") {
    throw new Error("buildPostNotificationHref must remain unchanged in this phase");
  }
}
