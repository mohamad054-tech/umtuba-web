import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../i18n/locales";
import { ROBOTS_DISALLOW_PATHS, SITEMAP_STATIC_ROUTES } from "./indexing";
import {
  buildBreadcrumbListJsonLd,
  buildCourseJsonLd,
  buildProductJsonLd,
  buildProfilePageJsonLd,
  buildSiteGraphJsonLd,
  buildSocialMediaPostingJsonLd,
  formatOfferPrice,
} from "./jsonLd";
import {
  SEO_ROUTE_KEYS,
  buildLocalizedRouteMetadata,
  getSeoCopy,
} from "./localizedSeo";
import {
  publicCourseSitemapPath,
  publicLifePostSitemapPath,
  publicProductSitemapPath,
  publicStorefrontSitemapPath,
} from "./publicSitemap";
import { storeCartMetadata, storeSearchMetadata } from "./routeMetadata";

const ROOT = process.cwd();

describe("Google SEO full optimization V1", () => {
  it("indexes public product areas and keeps private/auth out of the sitemap", () => {
    expect(SITEMAP_STATIC_ROUTES).toContain("/life");
    expect(SITEMAP_STATIC_ROUTES).toContain("/learning/catalog");
    expect(SITEMAP_STATIC_ROUTES).toContain("/store");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/learning");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/login");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/settings");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/store/cart");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/store/demo-preview");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/discover");
  });

  it("disallows account, commerce, and admin prefixes in robots", () => {
    for (const path of [
      "/login",
      "/settings",
      "/messages",
      "/store/cart",
      "/store/checkout",
      "/store/orders",
      "/life/compose",
      "/admin",
      "/seller",
      "/learning/instructor",
    ]) {
      expect(ROBOTS_DISALLOW_PATHS).toContain(path);
    }
    expect(ROBOTS_DISALLOW_PATHS).not.toContain("/life");
    expect(ROBOTS_DISALLOW_PATHS).not.toContain("/store");
    expect(ROBOTS_DISALLOW_PATHS).not.toContain("/learning/catalog");
  });

  it("does not invent path-prefix locale alternates", () => {
    const meta = buildLocalizedRouteMetadata({
      key: "life",
      path: "/life",
      locale: "ar",
    });
    expect(meta.alternates?.canonical).toBe("/life");
    expect(meta.alternates?.languages?.["x-default"]).toBe("/life");
    expect(meta.alternates?.languages?.ar).toBe("/life?hl=ar");
    expect(meta.alternates?.languages?.["zh-CN"]).toBe("/life?hl=zh-CN");
    expect(JSON.stringify(meta.alternates?.languages)).not.toMatch(/\/ar\/life/);
  });

  it("has unique localized titles for every supported locale", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(13);
    for (const locale of SUPPORTED_LOCALES) {
      const titles = SEO_ROUTE_KEYS.map((key) => getSeoCopy(key, locale).title);
      expect(new Set(titles).size).toBe(SEO_ROUTE_KEYS.length);
      for (const key of SEO_ROUTE_KEYS) {
        const copy = getSeoCopy(key, locale);
        expect(copy.title.length).toBeGreaterThan(3);
        expect(copy.description.length, `${locale}:${key}`).toBeGreaterThan(12);
        expect(copy.title).toMatch(/UMTUBA|امتوبا|UM Life|حياة UM/);
      }
    }
  });

  it("builds truthful Organization and WebSite JSON-LD without ratings", () => {
    const graph = buildSiteGraphJsonLd("https://umtuba.com");
    const serialized = JSON.stringify(graph);
    expect(serialized).toContain('"@type":"Organization"');
    expect(serialized).toContain('"@type":"WebSite"');
    expect(serialized).toContain("https://umtuba.com/search?q={search_term_string}");
    expect(serialized).not.toMatch(/aggregateRating|reviewCount|ratingValue/);
  });

  it("omits Course/Product markup when required facts are missing", () => {
    expect(buildCourseJsonLd({ name: "  ", path: "/learning/catalog/x" })).toBeNull();
    expect(buildProductJsonLd({ name: "", path: "/store/a/product/b" })).toBeNull();
    expect(formatOfferPrice(-1, "USD")).toBeNull();
    expect(formatOfferPrice(1299, "usd")).toBe("12.99");
    const product = buildProductJsonLd({
      name: "Mug",
      path: "/store/ada/product/mug",
      priceMinor: 500,
      currency: "USD",
      available: 2,
      forSale: true,
      origin: "https://umtuba.com",
    });
    expect(product?.offers).toMatchObject({
      "@type": "Offer",
      price: "5.00",
      priceCurrency: "USD",
    });
    const notForSale = buildProductJsonLd({
      name: "Mug",
      path: "/store/ada/product/mug",
      priceMinor: 500,
      currency: "USD",
      forSale: false,
    });
    expect(notForSale).not.toHaveProperty("offers");
  });

  it("builds breadcrumbs, profile, and life posting from public fields only", () => {
    const crumbs = buildBreadcrumbListJsonLd(
      [
        { name: "UMTUBA", path: "/" },
        { name: "Store", path: "/store" },
      ],
      "https://umtuba.com"
    );
    expect(crumbs?.itemListElement).toHaveLength(2);
    const profile = buildProfilePageJsonLd({
      username: "Ada",
      displayName: "Ada Lovelace",
      bio: "Inventor",
      origin: "https://umtuba.com",
    });
    expect(JSON.stringify(profile)).toContain("/profile/ada");
    expect(JSON.stringify(profile)).not.toMatch(/email|um points|city/i);
    const post = buildSocialMediaPostingJsonLd({
      id: 12,
      content: "Hello from UM Life",
      createdAt: "2026-08-01T00:00:00.000Z",
      authorName: "Ada",
      authorUsername: "ada",
      origin: "https://umtuba.com",
    });
    expect(post?.url).toBe("https://umtuba.com/life?post=12");
    expect(post).not.toHaveProperty("interactionStatistic");
  });

  it("keeps sandbox and invalid identities out of the public sitemap helpers", () => {
    expect(publicCourseSitemapPath("intro-to-arabic")).toBe(
      "/learning/catalog/intro-to-arabic"
    );
    expect(publicProductSitemapPath("ada-shop", "mug")).toBe(
      "/store/ada-shop/product/mug"
    );
    expect(publicProductSitemapPath("umtuba-e2e-20260721", "mug")).toBeNull();
    expect(publicProductSitemapPath("ada-shop", "e2e-simple-mug")).toBeNull();
    expect(publicStorefrontSitemapPath("umtuba-e2e-20260721")).toBeNull();
    expect(publicLifePostSitemapPath(0)).toBeNull();
    expect(publicLifePostSitemapPath(88)).toBe("/life?post=88");
  });

  it("marks cart and store search noindex", () => {
    expect(storeCartMetadata.robots).toMatchObject({ index: false });
    expect(storeSearchMetadata.robots).toMatchObject({ index: false });
  });

  it("wires layout JSON-LD and public generateMetadata", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/buildSiteGraphJsonLd/);
    expect(layout).toMatch(/<html[\s\S]*lang=\{locale\}/);
    const home = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    expect(home).toMatch(/export async function generateMetadata/);
    expect(home).toMatch(/key: "home"/);
    const life = readFileSync(join(ROOT, "app/life/page.tsx"), "utf8");
    expect(life).toMatch(/export async function generateMetadata/);
    expect(life).toMatch(/buildSocialMediaPostingJsonLd/);
    const robots = readFileSync(join(ROOT, "app/robots.ts"), "utf8");
    expect(robots).toMatch(/sitemap\.xml/);
    expect(robots).toMatch(/video-sitemap\.xml/);
  });
});
