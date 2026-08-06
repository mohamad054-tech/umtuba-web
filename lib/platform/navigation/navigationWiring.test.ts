import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_REGISTRY, getPageByPath } from "../pageRegistry";
import {
  assertBreadcrumbsResolve,
  buildBreadcrumbs,
  buildRobotsDocument,
  buildSitemapEntries,
  collectRobotsDisallowPaths,
  listAdminAdsNavLinks,
  listAdminStoreNavLinks,
  listAiAdminNavLinks,
  listAiDataNavLinks,
  listKnowledgeNavLinks,
  listPrivateAiNavLinks,
  listSettingsNavLinks,
} from "./index";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("UMTUBA Unified Navigation Wiring V1", () => {
  it("admin store navigation matches registry-derived paths", () => {
    const links = listAdminStoreNavLinks();
    expect(links.map((l) => l.href)).toEqual([
      "/admin/store",
      "/admin/store/sellers",
      "/admin/store/products",
      "/admin/store/reservations",
    ]);
    for (const link of links) {
      const page = getPageByPath(link.href);
      expect(page).toBeTruthy();
      expect(page!.id).toBe(link.pageId);
      expect(page!.adminOnly).toBe(true);
      expect(page!.domain).toBe("admin");
    }
  });

  it("admin ads navigation matches registry-derived paths", () => {
    const links = listAdminAdsNavLinks();
    expect(links.map((l) => l.href)).toEqual([
      "/admin/ads",
      "/admin/ads/advertisers",
      "/admin/ads/campaigns",
      "/admin/ads/creatives",
      "/admin/ads/reviews",
      "/admin/ads/diagnostics",
    ]);
    for (const link of links) {
      expect(getPageByPath(link.href)?.domain).toBe("admin");
    }
  });

  it("AI admin navigation matches registry-derived paths", () => {
    const privateAi = listPrivateAiNavLinks();
    const aiData = listAiDataNavLinks();
    const knowledge = listKnowledgeNavLinks();
    const all = listAiAdminNavLinks();

    expect(privateAi[0]?.href).toBe("/admin/private-ai");
    expect(aiData[0]?.href).toBe("/admin/ai-data");
    expect(knowledge[0]?.href).toBe("/admin/knowledge");

    for (const link of [...privateAi, ...aiData, ...knowledge, ...all]) {
      const page = getPageByPath(link.href)!;
      expect(page.domain).toBe("ai");
      expect(page.adminOnly).toBe(true);
    }
  });

  it("settings navigation matches registry and excludes admin", () => {
    const links = listSettingsNavLinks();
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const page = getPageByPath(link.href)!;
      expect(page.domain).toBe("settings");
      expect(page.adminOnly).toBe(false);
      expect(link.href.startsWith("/admin")).toBe(false);
    }
  });

  it("no admin page leaks into sitemap", () => {
    const sitemap = buildSitemapEntries();
    expect(sitemap.some((e) => e.path.startsWith("/admin"))).toBe(false);
    for (const entry of sitemap) {
      const page = getPageByPath(entry.path)!;
      expect(page.adminOnly).toBe(false);
      expect(page.access).toBe("public");
    }
  });

  it("robots rules are deterministic and include admin disallow", () => {
    const a = collectRobotsDisallowPaths();
    const b = collectRobotsDisallowPaths();
    expect(a).toEqual(b);
    expect(a).toContain("/admin/");
    const doc = buildRobotsDocument();
    expect(doc.rules[0]?.disallow).toEqual(a);
    expect(doc.sitemapPath).toBe("/sitemap.xml");
  });

  it("breadcrumbs resolve static and dynamic routes", () => {
    const staticCrumbs = buildBreadcrumbs("/admin/store/sellers");
    assertBreadcrumbsResolve(staticCrumbs);
    expect(staticCrumbs[staticCrumbs.length - 1]?.href).toBe(
      "/admin/store/sellers"
    );

    const dynamicCrumbs = buildBreadcrumbs("/profile/demo-user");
    assertBreadcrumbsResolve(dynamicCrumbs);
    expect(dynamicCrumbs.some((c) => c.href === "/")).toBe(true);
    expect(dynamicCrumbs[dynamicCrumbs.length - 1]?.dynamic).toBe(true);

    const unknown = buildBreadcrumbs("/this-route-does-not-exist-xyz");
    assertBreadcrumbsResolve(unknown);
    expect(unknown[0]?.href).toBe("/");
  });

  it("migrated shells no longer hardcode section NAV path arrays", () => {
    const files = [
      "app/admin/store/AdminStoreShell.tsx",
      "app/admin/ads/AdminAdsShell.tsx",
      "app/admin/private-ai/PrivateAiShell.tsx",
      "app/admin/ai-data/AiDataPlatformShell.tsx",
      "app/admin/knowledge/KnowledgeAcquisitionShell.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src).toMatch(/list\w+NavLinks/);
      expect(src).not.toMatch(
        /const NAV = \[\s*\{\s*href:\s*(PRIVATE_AI_BASE|AI_DATA_PLATFORM_BASE|KNOWLEDGE_ACQUISITION_BASE)/
      );
      expect(src).not.toMatch(
        /const LINKS = \[\s*\{\s*href:\s*APP_ROUTES\.admin/
      );
    }
  });

  it("indexing exports stay aligned with navigation builders", () => {
    const indexing = read("lib/site/indexing.ts");
    expect(indexing).toMatch(/buildSitemapEntries/);
    expect(indexing).toMatch(/collectRobotsDisallowPaths/);
    expect(indexing).not.toMatch(/\"\/discover\"/);
  });

  it("registry still backs every wired href", () => {
    const wired = [
      ...listAdminStoreNavLinks(),
      ...listAdminAdsNavLinks(),
      ...listPrivateAiNavLinks(),
      ...listAiDataNavLinks(),
      ...listKnowledgeNavLinks(),
      ...listSettingsNavLinks(),
    ];
    const ids = new Set(PAGE_REGISTRY.map((p) => p.id));
    for (const link of wired) {
      expect(ids.has(link.pageId)).toBe(true);
    }
  });
});
