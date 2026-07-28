/**
 * Home Readiness Guardrails V1
 *
 * Locks Video-First Home as a protected surface **without changing Home behavior**.
 * Preferred Flow (`Home → Creator Space → Content`) remains architectural only —
 * Content-flow Policy Decision V1. Implementing that funnel on Home requires:
 * 1. Separate Product GO
 * 2. Explicit Home unlock (this module’s `HOME_LOCK_ACTIVE` flipped only then)
 *
 * @see docs/architecture/HOME_READINESS_GUARDRAILS_V1.md
 * @see docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md §2.8
 */

import { HOME_CIRCLE_ENTRY_HREFS } from "./platformNavContract";
import { CONTENT_FLOW_PREFERRED_STEPS } from "./contentFlowPolicyContract";
import { APP_ROUTES } from "./routes";

/** Home remains locked — do not set false without Product GO + explicit unlock. */
export const HOME_LOCK_ACTIVE = true as const;

export const HOME_LOCKED_SURFACES = [
  "feed",
  "swipe",
  "ranking",
  "player",
  "circles-layout",
  "engagement",
  "home-shell",
] as const;

export type HomeLockedSurface = (typeof HOME_LOCKED_SURFACES)[number];

/**
 * Paths that constitute the Home lock inventory.
 * Editing these for behavior/visual changes requires Product GO + Home unlock.
 * Guardrails V1 may only add comments/contracts outside this list (or docs).
 */
export const HOME_LOCK_OWNED_PATHS = [
  "app/page.tsx",
  "app/components/home/HomeFeedLoader.tsx",
  "app/discover/DiscoverExperience.tsx",
  "app/discover/page.tsx",
  "app/discover/types.ts",
  "app/discover/error.tsx",
  "app/discover/components/index.ts",
  "app/discover/components/DiscoverShell.tsx",
  "app/discover/components/DiscoverFeed.tsx",
  "app/discover/components/DiscoverVideoCard.tsx",
  "app/discover/components/DiscoverNativeVideo.tsx",
  "app/discover/components/DiscoverActionRail.tsx",
  "app/discover/components/DiscoverCreatorInfo.tsx",
  "app/discover/components/DiscoverCaption.tsx",
  "app/discover/components/DiscoverLocationBanner.tsx",
  "app/discover/components/HomeSectionCircles.tsx",
] as const;

/**
 * Shared video helpers used by Home (and often Watch).
 * Not exclusively Home-owned — still treat Home-affecting edits as locked.
 */
export const HOME_LOCK_RELATED_SHARED_PATHS = [
  "app/lib/video/feedPagination.ts",
  "app/lib/video/feedPolicy.ts",
  "app/lib/video/recordFeedView.ts",
  "app/lib/video/recordWatchSignal.ts",
  "lib/supabase/videoPostsServer.ts",
] as const;

export const HOME_LOCK_INVARIANTS = [
  "Home `/` is the Video-First Discovery Layer",
  "`/discover` remains a forever alias to `/` (query preserved)",
  "Home shell title remains Home; circles are entry ramps only (layout locked)",
  "Preferred Flow Home → Creator Space → Content is documented, not forced on Home CTAs",
  "No Home feed / swipe / ranking / player / circles / engagement changes without unlock",
] as const;

export function assertHomeReadinessGuardrails(): void {
  if (HOME_LOCK_ACTIVE !== true) {
    throw new Error(
      "HOME_LOCK_ACTIVE must stay true until Product GO + explicit Home unlock"
    );
  }

  if (!HOME_LOCKED_SURFACES.includes("feed")) {
    throw new Error("feed must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("swipe")) {
    throw new Error("swipe must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("ranking")) {
    throw new Error("ranking must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("player")) {
    throw new Error("player must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("circles-layout")) {
    throw new Error("circles-layout must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("engagement")) {
    throw new Error("engagement must remain a locked Home surface");
  }
  if (!HOME_LOCKED_SURFACES.includes("home-shell")) {
    throw new Error("home-shell must remain a locked Home surface");
  }

  if (APP_ROUTES.home !== "/") {
    throw new Error("Home canonical path must remain /");
  }

  if (!HOME_CIRCLE_ENTRY_HREFS.length) {
    throw new Error("Home circle entry contract must remain defined");
  }

  // Preferred Flow stays documented steps — not a Home implementation toggle.
  if (
    CONTENT_FLOW_PREFERRED_STEPS.join(">") !==
    "home-discovery>creator-space>content-destination"
  ) {
    throw new Error("Preferred Flow steps drifted from Content-flow Policy Decision");
  }
}
