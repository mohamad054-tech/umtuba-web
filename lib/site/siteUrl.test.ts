import { describe, expect, it } from "vitest";
import { BRAND } from "./brand";
import {
  absoluteUrl,
  getSiteUrl,
  resolveAuthRedirectOrigin,
  resolveSiteUrl,
  validateSiteUrl,
} from "./siteUrl";

describe("validateSiteUrl", () => {
  it("accepts https production origin", () => {
    expect(validateSiteUrl("https://umtuba.com")).toEqual({
      ok: true,
      origin: "https://umtuba.com",
    });
  });

  it("strips path to origin", () => {
    expect(validateSiteUrl("https://umtuba.com/path")).toEqual({
      ok: true,
      origin: "https://umtuba.com",
    });
  });

  it("rejects malformed values", () => {
    expect(validateSiteUrl("not-a-url").ok).toBe(false);
    expect(validateSiteUrl("").ok).toBe(false);
  });

  it("rejects non-http protocols", () => {
    const result = validateSiteUrl("ftp://umtuba.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue).toBe("unsupported_protocol");
  });
});

describe("resolveSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when valid", () => {
    const result = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
      NODE_ENV: "production",
    });
    expect(result).toEqual({
      origin: "https://umtuba.com",
      fromEnv: true,
      issue: null,
    });
  });

  it("falls back to production default when env missing in production", () => {
    const result = resolveSiteUrl({ NODE_ENV: "production" });
    expect(result.origin).toBe(BRAND.productionOrigin);
    expect(result.fromEnv).toBe(false);
    expect(result.issue).toBe("missing");
  });

  it("falls back to localhost in development when env missing", () => {
    const result = resolveSiteUrl({ NODE_ENV: "development" });
    expect(result.origin).toBe(BRAND.developmentOrigin);
  });

  it("falls back when NEXT_PUBLIC_SITE_URL is malformed", () => {
    const result = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: ":::bad",
      NODE_ENV: "production",
    });
    expect(result.fromEnv).toBe(false);
    expect(result.issue).toBe("malformed");
    expect(result.origin).toBe(BRAND.productionOrigin);
  });

  it("uses VERCEL_URL for preview when site URL unset", () => {
    const result = resolveSiteUrl({
      NODE_ENV: "production",
      VERCEL_URL: "my-app-git-preview.vercel.app",
    });
    expect(result.origin).toBe("https://my-app-git-preview.vercel.app");
    expect(result.fromEnv).toBe(false);
  });

  it("prefers valid NEXT_PUBLIC_SITE_URL over VERCEL_URL", () => {
    const result = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
      VERCEL_URL: "my-app-git-preview.vercel.app",
      NODE_ENV: "production",
    });
    expect(result.origin).toBe("https://umtuba.com");
    expect(result.fromEnv).toBe(true);
  });
});

describe("getSiteUrl / absoluteUrl", () => {
  it("builds absolute paths", () => {
    expect(
      absoluteUrl("/discover", {
        NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
      })
    ).toBe("https://umtuba.com/discover");
    expect(
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://umtuba.com/" })
    ).toBe("https://umtuba.com");
  });
});

describe("resolveAuthRedirectOrigin", () => {
  it("keeps public request origins unchanged", () => {
    expect(
      resolveAuthRedirectOrigin("https://umtuba.com", {
        NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
        NODE_ENV: "production",
      })
    ).toBe("https://umtuba.com");
    expect(
      resolveAuthRedirectOrigin("https://staging.umtuba.com", {
        NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
        NODE_ENV: "production",
      })
    ).toBe("https://staging.umtuba.com");
  });

  it("replaces production loopback Host with configured public origin", () => {
    expect(
      resolveAuthRedirectOrigin("https://localhost:3001", {
        NEXT_PUBLIC_SITE_URL: "https://umtuba.com",
        NODE_ENV: "production",
      })
    ).toBe("https://umtuba.com");
    expect(
      resolveAuthRedirectOrigin("http://127.0.0.1:3001", {
        NODE_ENV: "production",
      })
    ).toBe(BRAND.productionOrigin);
  });

  it("preserves intentional local-dev loopback (including non-default ports)", () => {
    expect(
      resolveAuthRedirectOrigin("http://localhost:3001", {
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NODE_ENV: "development",
      })
    ).toBe("http://localhost:3001");
    expect(
      resolveAuthRedirectOrigin("http://localhost:3000", {
        NODE_ENV: "development",
      })
    ).toBe("http://localhost:3000");
  });
});
