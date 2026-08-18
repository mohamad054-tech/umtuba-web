import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, APP_ROUTES } from "../../app/lib/nav/routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "../../app/lib/nav/mobileNav";
import { buildUserMenuGroups } from "../../app/lib/nav/userMenuItems";
import { USER_MENU_CAPABILITIES_SIGNED_IN_BASE } from "../../app/lib/nav/userMenuCapabilities";
import { ROBOTS_DISALLOW_PATHS, SITEMAP_STATIC_ROUTES } from "../site/indexing";
import { SANDBOX_MESSAGE_KEYS, sandboxDirection, sandboxT } from "./i18n";
import { SANDBOX_PATH } from "./paths";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("business sandbox containment", () => {
  it("is not in public nav, user menu, or sitemap", () => {
    expect(APP_NAV_ITEMS.some((item) => item.href.includes("/sandbox"))).toBe(false);
    expect(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href.includes("/sandbox"))).toBe(false);
    const menu = buildUserMenuGroups(
      "/profile/contract_user",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    ).flatMap((group) => group.items.map((item) => item.href));
    expect(menu.some((href) => href.includes("/sandbox"))).toBe(false);
    expect(SITEMAP_STATIC_ROUTES).not.toContain(SANDBOX_PATH);
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/sandbox");
  });

  it("disallows crawlers on /sandbox", () => {
    expect(ROBOTS_DISALLOW_PATHS).toContain("/sandbox");
  });

  it("does not graft fixtures onto public store or learning catalogs", () => {
    expect(read("app/store/page.tsx")).not.toMatch(/lib\/sandbox/);
    expect(read("app/store/page.tsx")).not.toMatch(/sandbox\/store/);
    expect(read("app/learning/page.tsx")).not.toMatch(/lib\/sandbox/);
    expect(read("lib/store/demo/catalog.ts")).not.toMatch(/lib\/sandbox/);
  });

  it("keeps chrome source free of sandbox hrefs", () => {
    for (const rel of [
      "app/components/AppTopNav.tsx",
      "app/components/AppMobileBottomNav.tsx",
      "app/lib/nav/userMenuItems.ts",
    ]) {
      expect(read(rel)).not.toMatch(/sandbox\/business-preview/);
    }
  });

  it("exposes a dedicated APP_ROUTES entry that is not a primary dest", () => {
    expect(APP_ROUTES.sandboxBusinessPreview).toBe(SANDBOX_PATH);
    expect(APP_NAV_ITEMS.map((item) => item.href)).not.toContain(SANDBOX_PATH);
  });

  it("covers ar+en and keeps Arabic RTL", () => {
    expect(sandboxDirection("ar")).toBe("rtl");
    expect(sandboxDirection("en")).toBe("ltr");
    expect(sandboxT("en", "title")).toMatch(/sandbox|preview/i);
    expect(sandboxT("ar", "title").length).toBeGreaterThan(4);
    expect(SANDBOX_MESSAGE_KEYS.length).toBeGreaterThan(20);
    for (const locale of ["fr", "es", "de", "pt"] as const) {
      expect(sandboxT(locale, "badge")).toBeTruthy();
    }
  });

  it("gives the store shopper shell a single sandbox indicator", () => {
    const shell = read("app/components/sandbox/store/StoreShopperShell.tsx");
    expect(shell).toMatch(/sx-sandbox-one/);
    expect(shell.match(/sx-badge/g)?.length).toBe(1);
    expect(read("app/store/page.tsx")).not.toMatch(/StoreShopperShell/);
  });

  it("declares responsive breakpoints in sandbox CSS", () => {
    const css = read("app/components/sandbox/sandbox.css");
    for (const width of [360, 390, 430, 768, 1024, 1440]) {
      expect(css).toMatch(new RegExp(String(width)));
    }
  });
});
