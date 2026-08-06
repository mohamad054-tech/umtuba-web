/**
 * UMTUBA Unified Page Registry — shared types (V1).
 * Inventory only: does not change routing or page behavior.
 */

export const PAGE_DOMAINS = [
  "platform",
  "identity",
  "profile",
  "content",
  "commerce",
  "learning",
  "collaboration",
  "ai",
  "admin",
  "settings",
  "operations",
] as const;

export type PageDomain = (typeof PAGE_DOMAINS)[number];

export const PAGE_AUDIENCES = [
  "public",
  "member",
  "creator",
  "seller",
  "buyer",
  "instructor",
  "learner",
  "advertiser",
  "admin",
  "operator",
] as const;

export type PageAudience = (typeof PAGE_AUDIENCES)[number];

export const PAGE_ACCESS_LEVELS = [
  "public",
  "authenticated",
  "role_gated",
  "admin",
] as const;

export type PageAccess = (typeof PAGE_ACCESS_LEVELS)[number];

export const PAGE_NAV_VISIBILITY = [
  "primary",
  "secondary",
  "utility",
  "hidden",
  "none",
] as const;

export type PageNavigationVisibility = (typeof PAGE_NAV_VISIBILITY)[number];

export const PAGE_STATUSES = [
  "active",
  "legacy",
  "deprecated",
  "experimental",
] as const;

export type PageStatus = (typeof PAGE_STATUSES)[number];

export type PageRegistryEntry = {
  id: string;
  path: string;
  title: string;
  description: string;
  domain: PageDomain;
  section: string;
  audience: PageAudience;
  access: PageAccess;
  navigationVisibility: PageNavigationVisibility;
  adminOnly: boolean;
  authenticated: boolean;
  dynamic: boolean;
  parentId: string | null;
  legacy: boolean;
  deprecated: boolean;
  sourceFile: string;
  status: PageStatus;
  /** True when not reachable from known primary/user-menu/APP_ROUTES hubs. */
  orphan?: boolean;
};

export type PageOverlapNote = {
  paths: readonly string[];
  note: string;
};
