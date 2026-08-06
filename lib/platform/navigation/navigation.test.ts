import { describe, expect, it } from "vitest";
import {
  PAGE_REGISTRY,
  getPageByPath,
  listOrphanPages,
  listPublicPages,
} from "../pageRegistry";
import {
  ADMIN_NAV_CONTEXT,
  NAVIGATION_GROUP_IDS,
  PUBLIC_NAV_CONTEXT,
  assertBreadcrumbsResolve,
  assertNavigationItemsInRegistry,
  assertUniqueNavigationPaths,
  buildAllNavigationGroups,
  buildBreadcrumbs,
  buildNavigationGroup,
  buildRobotsDocument,
  buildSitemapEntries,
  listAllNavigationItems,
  reportNavigationOrphans,
} from "./index";

describe("UMTUBA Unified Navigation Foundation V1", () => {
  it("exposes all required navigation groups", () => {
    const groups = buildAllNavigationGroups();
    expect(groups.map((g) => g.id).sort()).toEqual(
      [...NAVIGATION_GROUP_IDS].sort()
    );
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("every navigation item exists in Page Registry", () => {
    const items = listAllNavigationItems();
    expect(items.length).toBeGreaterThan(0);
    assertNavigationItemsInRegistry(items, PAGE_REGISTRY);
    for (const item of items) {
      const page = PAGE_REGISTRY.find((p) => p.id === item.pageId);
      expect(page).toBeTruthy();
      expect(page!.path).toBe(item.href);
    }
  });

  it("duplicate paths within a group are rejected", () => {
    for (const id of NAVIGATION_GROUP_IDS) {
      const group = buildNavigationGroup(id);
      expect(() => assertUniqueNavigationPaths(group.items)).not.toThrow();
      const paths = group.items.map((i) => i.href);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it("hidden pages stay hidden from navigation groups", () => {
    const items = listAllNavigationItems();
    for (const item of items) {
      expect(item.visibility).not.toBe("hidden");
      expect(item.visibility).not.toBe("none");
      const page = PAGE_REGISTRY.find((p) => p.id === item.pageId)!;
      expect(page.navigationVisibility).not.toBe("hidden");
      expect(page.deprecated).toBe(false);
    }
  });

  it("public context excludes admin and auth-only items", () => {
    const publicItems = listAllNavigationItems(PAGE_REGISTRY, PUBLIC_NAV_CONTEXT);
    for (const item of publicItems) {
      expect(item.adminOnly).toBe(false);
      expect(item.access).not.toBe("admin");
      expect(item.access).not.toBe("authenticated");
      expect(item.access).not.toBe("role_gated");
    }
  });

  it("admin context includes admin group items", () => {
    const adminGroup = buildNavigationGroup(
      "admin",
      PAGE_REGISTRY,
      ADMIN_NAV_CONTEXT
    );
    const aiAdmin = buildNavigationGroup(
      "aiAdmin",
      PAGE_REGISTRY,
      ADMIN_NAV_CONTEXT
    );
    expect(adminGroup.items.length).toBeGreaterThan(0);
    expect(aiAdmin.items.length).toBeGreaterThan(0);
    expect(aiAdmin.items.every((i) => i.domain === "ai")).toBe(true);
    expect(adminGroup.items.every((i) => i.domain === "admin")).toBe(true);
  });

  it("every breadcrumb resolves for all registry paths", () => {
    for (const page of PAGE_REGISTRY) {
      const crumbs = buildBreadcrumbs(page.path, PAGE_REGISTRY);
      expect(crumbs.length).toBeGreaterThan(0);
      assertBreadcrumbsResolve(crumbs, PAGE_REGISTRY);
      expect(crumbs[crumbs.length - 1]?.pageId).toBe(page.id);
    }
  });

  it("breadcrumbs resolve for concrete dynamic-like paths", () => {
    const crumbs = buildBreadcrumbs("/profile/demo-user", PAGE_REGISTRY);
    assertBreadcrumbsResolve(crumbs, PAGE_REGISTRY);
    expect(crumbs.some((c) => c.href === "/" || c.pageId === "platform.home")).toBe(
      true
    );
    expect(crumbs[crumbs.length - 1]?.dynamic).toBe(true);
  });

  it("sitemap contains all public static pages and excludes admin", () => {
    const sitemap = buildSitemapEntries(PAGE_REGISTRY);
    const publicStatic = listPublicPages().filter(
      (p) =>
        !p.dynamic &&
        !p.deprecated &&
        p.navigationVisibility !== "hidden" &&
        p.domain !== "identity" &&
        p.section !== "auth" &&
        !(p.legacy && p.path !== "/discover") &&
        p.path !== "/discover"
    );

    const sitemapPaths = new Set(sitemap.map((e) => e.path));
    for (const page of publicStatic) {
      expect(sitemapPaths.has(page.path)).toBe(true);
    }

    for (const entry of sitemap) {
      const page = getPageByPath(entry.path)!;
      expect(page.adminOnly).toBe(false);
      expect(page.access).toBe("public");
      expect(page.dynamic).toBe(false);
      expect(page.domain).not.toBe("identity");
    }

    expect(sitemap.some((e) => e.path.startsWith("/admin"))).toBe(false);
    expect(sitemap.some((e) => e.path === "/login")).toBe(false);
  });

  it("robots disallow includes admin prefix", () => {
    const robots = buildRobotsDocument(PAGE_REGISTRY);
    const disallow = robots.rules[0]!.disallow;
    expect(disallow).toContain("/admin/");
  });

  it("orphan pages are reported from registry", () => {
    const reported = reportNavigationOrphans(PAGE_REGISTRY);
    const orphans = listOrphanPages();
    expect(reported.length).toBe(orphans.length);
    expect(new Set(reported.map((r) => r.pageId))).toEqual(
      new Set(orphans.map((o) => o.id))
    );
  });

  it("learning group never includes commerce pages", () => {
    const learning = buildNavigationGroup("learning");
    expect(learning.items.every((i) => i.domain === "learning")).toBe(true);
    expect(learning.items.some((i) => i.domain === "commerce")).toBe(false);
  });

  it("commerce group never includes learning pages", () => {
    const commerce = buildNavigationGroup("commerce");
    expect(commerce.items.every((i) => i.domain === "commerce")).toBe(true);
    expect(commerce.items.some((i) => i.domain === "learning")).toBe(false);
  });
});
