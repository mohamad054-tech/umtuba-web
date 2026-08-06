/**
 * UMTUBA Unified Navigation Foundation — types (V1).
 * Framework only: consumes Page Registry; does not redefine routes.
 */

import type {
  PageAccess,
  PageAudience,
  PageDomain,
  PageNavigationVisibility,
  PageRegistryEntry,
  PageStatus,
} from "../pageRegistry";

export const NAVIGATION_GROUP_IDS = [
  "main",
  "user",
  "admin",
  "settings",
  "aiAdmin",
  "learning",
  "commerce",
] as const;

export type NavigationGroupId = (typeof NAVIGATION_GROUP_IDS)[number];

/** Viewer / request context used for visibility filtering. */
export type NavigationContext = {
  authenticated: boolean;
  isAdmin: boolean;
  /** Optional capability flags — foundation only, no business logic. */
  capabilities?: {
    showInstructor?: boolean;
    showSeller?: boolean;
    showAdvertise?: boolean;
  };
};

export type NavigationItem = {
  /** Stable id aligned with Page Registry entry id. */
  id: string;
  /** Registry page id (same as id; explicit for consumers). */
  pageId: string;
  label: string;
  href: string;
  domain: PageDomain;
  section: string;
  access: PageAccess;
  audience: PageAudience;
  visibility: PageNavigationVisibility;
  adminOnly: boolean;
  authenticated: boolean;
  dynamic: boolean;
  status: PageStatus;
  groupId: NavigationGroupId;
  parentPageId: string | null;
  order: number;
};

export type NavigationGroup = {
  id: NavigationGroupId;
  label: string;
  description: string;
  items: NavigationItem[];
};

export type BreadcrumbItem = {
  pageId: string;
  label: string;
  href: string;
  /** True when href is a dynamic template (contains brackets). */
  dynamic: boolean;
};

export type SitemapEntry = {
  path: string;
  pageId: string;
  /** changefreq hint for generators — not written to disk in this milestone. */
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
};

export type RobotsRule = {
  userAgent: string;
  allow: string[];
  disallow: string[];
};

export type RobotsDocument = {
  rules: RobotsRule[];
  sitemapPath: string;
};

export type NavigationOrphanReport = {
  pageId: string;
  path: string;
  title: string;
};

export type PageRegistrySource = readonly PageRegistryEntry[];
