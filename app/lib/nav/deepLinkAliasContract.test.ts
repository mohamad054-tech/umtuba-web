import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUTH_SAFE_REDIRECT_DEFAULT_PATH,
  DISCOVER_ALIAS_QUERY_KEYS,
  DISCOVER_ALIAS_TARGET_PATH,
  DISCOVER_HOME_ALIAS_PATH,
  PROFILE_INDEX_LOGIN_NEXT_PATH,
  PROFILE_INDEX_RESOLVER_PATH,
  buildPostFocusDeepLink,
  isDiscoverHomeAliasPath,
} from "./deepLinkAliasContract";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildDiscoverCityHref,
  buildPostNotificationHref,
  isNavActive,
} from "./routes";
import { isMobilePrimaryNavActive } from "./mobileNav";
import { AUTH_DEFAULT_NEXT_PATH, DISCOVER_HOME_ALIAS } from "./platformNavContract";
import { getSafeRedirectPath } from "../../../lib/supabase/redirect";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Deep-link & Alias Clarity V1", () => {
  describe("/discover → / forever alias", () => {
    it("freezes alias path, Home target, and preserved query keys", () => {
      expect(DISCOVER_HOME_ALIAS_PATH).toBe("/discover");
      expect(DISCOVER_ALIAS_TARGET_PATH).toBe("/");
      expect(DISCOVER_HOME_ALIAS).toBe(DISCOVER_HOME_ALIAS_PATH);
      expect([...DISCOVER_ALIAS_QUERY_KEYS]).toEqual([
        "post",
        "city",
        "comment",
        "country",
      ]);

      const discoverPage = read("app/discover/page.tsx");
      expect(discoverPage).toMatch(/Compatible alias/);
      expect(discoverPage).toMatch(/redirect/);
      expect(discoverPage).toMatch(/APP_ROUTES\.home/);
      for (const key of DISCOVER_ALIAS_QUERY_KEYS) {
        expect(discoverPage).toContain(`params.${key}`);
      }

      expect(isDiscoverHomeAliasPath("/discover")).toBe(true);
      expect(isDiscoverHomeAliasPath("/discover?post=1")).toBe(true);
      expect(isDiscoverHomeAliasPath("/")).toBe(false);
      expect(isNavActive("/discover", APP_ROUTES.home)).toBe(true);
      expect(isNavActive("/discover", APP_ROUTES.discover)).toBe(false);
      expect(isMobilePrimaryNavActive("/discover", "umLife")).toBe(true);
      expect(isMobilePrimaryNavActive("/life", "umLife")).toBe(true);
    });
  });

  describe("buildPostNotificationHref", () => {
    it("routes post focus through Discover alias (then Home redirect)", () => {
      expect(buildPostNotificationHref({ postId: "42" })).toBe(
        "/discover?post=42"
      );
      expect(
        buildPostNotificationHref({ postId: 7, commentId: "c1" })
      ).toBe("/discover?post=7&comment=c1");
      expect(buildPostFocusDeepLink({ postId: "42" })).toBe(
        buildPostNotificationHref({ postId: "42" })
      );
      expect(buildDiscoverCityHref("Amman", "JO")).toMatch(
        /^\/discover\?city=/
      );
    });
  });

  describe("/profile resolver", () => {
    it("documents signed-out login next and owner username/settings redirects", () => {
      expect(PROFILE_INDEX_RESOLVER_PATH).toBe("/profile");
      expect(PROFILE_INDEX_LOGIN_NEXT_PATH).toBe("/profile");
      const profileIndex = read("app/profile/page.tsx");
      expect(profileIndex).toMatch(/Bare `\/profile`/);
      expect(profileIndex).toMatch(/APP_ROUTES\.login/);
      expect(profileIndex).toMatch(/encodeURIComponent\(APP_ROUTES\.profile\)/);
      expect(profileIndex).toMatch(/buildCreatorProfileHref/);
      expect(profileIndex).toMatch(/APP_ROUTES\.settings/);
      expect(
        buildCreatorProfileHref({ username: "Maya" })
      ).toBe("/profile/maya");
    });
  });

  describe("Auth ?next= default", () => {
    it("keeps /discover as default (Home via alias) — change to / deferred", () => {
      expect(AUTH_SAFE_REDIRECT_DEFAULT_PATH).toBe("/discover");
      expect(AUTH_DEFAULT_NEXT_PATH).toBe(AUTH_SAFE_REDIRECT_DEFAULT_PATH);
      expect(getSafeRedirectPath(null)).toBe("/discover");
      expect(getSafeRedirectPath(undefined)).toBe("/discover");
      expect(getSafeRedirectPath("")).toBe("/discover");
      expect(getSafeRedirectPath("/messages")).toBe("/messages");
      expect(getSafeRedirectPath("//evil.example")).toBe("/discover");

      const redirectSrc = read("lib/supabase/redirect.ts");
      expect(redirectSrc).toMatch(/fallback = "\/discover"/);
      expect(redirectSrc).toMatch(/Deep-link & Alias Clarity V1/);
    });
  });
});
