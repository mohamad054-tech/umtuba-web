import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPageMetadata } from "./metadata";
import { OG_IMAGE_PATH } from "./metadata";
import {
  buildVideoObjectJsonLd,
  buildWatchPostMetadata,
  buildWatchPostPath,
  iso8601DurationFromMs,
  parsePublicPostId,
  truthfulVideoDescription,
  truthfulVideoTitle,
} from "./videoSeo";
import { buildHreflangLanguages } from "./hreflang";
import { storeMetadata, worldDiscoveryMetadata } from "./routeMetadata";
import { ROBOTS_DISALLOW_PATHS, SITEMAP_STATIC_ROUTES } from "./indexing";

const ROOT = process.cwd();

describe("video SEO V1", () => {
  it("builds the mobile-aligned exact-post canonical path", () => {
    expect(buildWatchPostPath(52)).toBe("/watch?post=52");
    expect(parsePublicPostId("52")).toBe(52);
    expect(parsePublicPostId("0")).toBeNull();
    expect(parsePublicPostId("nope")).toBeNull();
  });

  it("uses truthful titles and does not invent captions", () => {
    expect(
      truthfulVideoTitle({
        id: 48,
        caption: "فرحا بشئ ما _محمود درويش",
        createdAt: "2026-08-01T00:00:00.000Z",
        durationMs: 12000,
        authorName: "Khader",
        authorUsername: "khader",
        articleTitle: null,
      })
    ).toBe("فرحا بشئ ما _محمود درويش");

    expect(
      truthfulVideoTitle({
        id: 1,
        caption: "  ",
        createdAt: "2026-08-01T00:00:00.000Z",
        durationMs: null,
        authorName: "Ada",
        authorUsername: "ada",
        articleTitle: null,
      })
    ).toBe("Video by Ada");
  });

  it("omits duration when unknown and formats ISO-8601 when known", () => {
    expect(iso8601DurationFromMs(null)).toBeNull();
    expect(iso8601DurationFromMs(0)).toBeNull();
    expect(iso8601DurationFromMs(12_000)).toBe("PT12S");
    expect(iso8601DurationFromMs(90_000)).toBe("PT1M30S");
  });

  it("builds VideoObject without signed content URLs", () => {
    const json = buildVideoObjectJsonLd(
      {
        id: 52,
        caption: "Hello world",
        createdAt: "2026-08-01T12:00:00.000Z",
        durationMs: 15000,
        authorName: "Ada",
        authorUsername: "ada",
        articleTitle: null,
      },
      "https://umtuba.com"
    );
    expect(json["@type"]).toBe("VideoObject");
    expect(json.url).toBe("https://umtuba.com/watch?post=52");
    expect(json.embedUrl).toBe("https://umtuba.com/watch?post=52");
    expect(json.thumbnailUrl[0]).toBe(`https://umtuba.com${OG_IMAGE_PATH}`);
    expect(JSON.stringify(json)).not.toMatch(/token=|signature=|Expires=/i);
    expect(json).not.toHaveProperty("contentUrl");
  });

  it("sets per-post canonical, OG url, and hreflang + x-default", () => {
    const meta = buildWatchPostMetadata({
      id: 52,
      caption: "Hello world",
      createdAt: "2026-08-01T12:00:00.000Z",
      durationMs: 15000,
      authorName: "Ada",
      authorUsername: "ada",
      articleTitle: null,
    });
    expect(meta.alternates?.canonical).toBe("/watch?post=52");
    expect(meta.openGraph?.url).toBe("/watch?post=52");
    expect(meta.alternates?.languages?.["x-default"]).toBe("/watch?post=52");
    expect(meta.alternates?.languages?.ar).toBe("/watch?post=52&hl=ar");
    expect(meta.alternates?.languages?.pt).toBe("/watch?post=52&hl=pt");
    const images = meta.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : null;
    if (!first || typeof first === "string" || first instanceof URL) {
      throw new Error("expected OG image object");
    }
    expect(first.url).toBe(OG_IMAGE_PATH);
  });

  it("does not expose private following in the public sitemap", () => {
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/following");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/following");
  });

  it("fixes Store and World canonicals away from root", () => {
    expect(storeMetadata.alternates?.canonical).toBe("/store");
    expect(worldDiscoveryMetadata.alternates?.canonical).toBe("/world");
    expect(worldDiscoveryMetadata.robots).toMatchObject({ index: false });
    const noindex = buildPageMetadata({
      title: "t",
      description: "d",
      path: "/following",
      index: "noindex",
    });
    expect(noindex.alternates?.languages).toBeUndefined();
  });

  it("hreflang helper keeps x-default without hl", () => {
    const langs = buildHreflangLanguages("/watch?post=8");
    expect(langs["x-default"]).toBe("/watch?post=8");
    expect(langs.en).toBe("/watch?post=8&hl=en");
  });

  it("watch page uses generateMetadata and VideoObject JSON-LD", () => {
    const watch = readFileSync(join(ROOT, "app/watch/page.tsx"), "utf8");
    expect(watch).toMatch(/export async function generateMetadata/);
    expect(watch).toMatch(/buildWatchPostMetadata/);
    expect(watch).toMatch(/VideoObjectJsonLdScript/);
    expect(watch).not.toMatch(/export const metadata = watchMetadata/);
  });

  it("video sitemap route exists and robots lists it", () => {
    const sitemap = readFileSync(
      join(ROOT, "app/video-sitemap.xml/route.ts"),
      "utf8"
    );
    expect(sitemap).toMatch(/xmlns:video/);
    expect(sitemap).toMatch(/video:player_loc/);
    expect(sitemap).toMatch(/listPublicVideosForSitemap/);
    const robots = readFileSync(join(ROOT, "app/robots.ts"), "utf8");
    expect(robots).toMatch(/video-sitemap\.xml/);
  });
});
