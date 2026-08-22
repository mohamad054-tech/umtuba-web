import { BRAND } from "./brand";
import { isSafePublicShareImageUrl, truncateForMeta } from "./metadata";
import { getSiteUrl } from "./siteUrl";

export type JsonLdRecord = Record<string, unknown>;

export function organizationId(origin = getSiteUrl()): string {
  return `${origin}/#organization`;
}

export function websiteId(origin = getSiteUrl()): string {
  return `${origin}/#website`;
}

export function buildOrganizationJsonLd(
  origin = getSiteUrl()
): JsonLdRecord {
  return {
    "@type": "Organization",
    "@id": organizationId(origin),
    name: BRAND.name,
    url: `${origin}/`,
    slogan: BRAND.tagline,
    logo: `${origin}/favicon.ico`,
  };
}

export function buildWebSiteJsonLd(origin = getSiteUrl()): JsonLdRecord {
  return {
    "@type": "WebSite",
    "@id": websiteId(origin),
    name: BRAND.name,
    url: `${origin}/`,
    inLanguage: "en",
    publisher: { "@id": organizationId(origin) },
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSiteGraphJsonLd(origin = getSiteUrl()): JsonLdRecord {
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationJsonLd(origin), buildWebSiteJsonLd(origin)],
  };
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbListJsonLd(
  items: BreadcrumbItem[],
  origin = getSiteUrl()
): JsonLdRecord | null {
  const crumbs = items
    .map((item) => ({
      name: item.name.trim(),
      path: item.path.startsWith("/") ? item.path : `/${item.path}`,
    }))
    .filter((item) => item.name.length > 0);
  if (crumbs.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path === "/" ? "/" : item.path}`,
    })),
  };
}

export function buildItemListJsonLd(input: {
  name: string;
  items: Array<{ name: string; path: string }>;
  origin?: string;
}): JsonLdRecord | null {
  const origin = input.origin ?? getSiteUrl();
  const items = input.items
    .map((item) => ({
      name: item.name.trim(),
      path: item.path.startsWith("/") ? item.path : `/${item.path}`,
    }))
    .filter((item) => item.name && item.path);
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${origin}${item.path}`,
    })),
  };
}

export function buildCourseJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  isFree?: boolean;
  origin?: string;
}): JsonLdRecord | null {
  const name = input.name.trim();
  if (!name) return null;
  const origin = input.origin ?? getSiteUrl();
  const description =
    input.description?.trim() ||
    `A public course on ${BRAND.name} Learning.`;

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description: truncateForMeta(description, 300),
    url: `${origin}${input.path}`,
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      sameAs: `${origin}/`,
    },
    ...(input.isFree === true ? { isAccessibleForFree: true } : {}),
    ...(input.isFree === false ? { isAccessibleForFree: false } : {}),
  };
}

export function formatOfferPrice(
  amountMinor: number,
  currency: string
): string | null {
  if (!Number.isFinite(amountMinor) || amountMinor < 0) return null;
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return (amountMinor / 100).toFixed(2);
}

export function buildProductJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  imageUrl?: string | null;
  priceMinor?: number | null;
  currency?: string | null;
  available?: number | null;
  sellerName?: string | null;
  forSale?: boolean;
  origin?: string;
}): JsonLdRecord | null {
  const name = input.name.trim();
  if (!name) return null;
  const origin = input.origin ?? getSiteUrl();
  const url = `${origin}${input.path}`;
  const image = isSafePublicShareImageUrl(input.imageUrl)
    ? input.imageUrl
    : null;
  const description = input.description?.trim()
    ? truncateForMeta(input.description, 300)
    : undefined;

  const record: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    ...(input.sellerName?.trim()
      ? { brand: { "@type": "Brand", name: input.sellerName.trim() } }
      : {}),
  };

  if (input.forSale === false) {
    return record;
  }

  const price =
    input.priceMinor != null && input.currency
      ? formatOfferPrice(input.priceMinor, input.currency)
      : null;
  if (!price || !input.currency) {
    return record;
  }

  const availability =
    input.available == null
      ? undefined
      : input.available > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

  record.offers = {
    "@type": "Offer",
    url,
    priceCurrency: input.currency.trim().toUpperCase(),
    price,
    ...(availability ? { availability } : {}),
  };

  return record;
}

export function buildProfilePageJsonLd(input: {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  origin?: string;
}): JsonLdRecord | null {
  const username = input.username.trim().replace(/^@+/, "").toLowerCase();
  if (!username) return null;
  const origin = input.origin ?? getSiteUrl();
  const path = `/profile/${username}`;
  const display =
    (input.displayName && input.displayName.trim()) || username;
  const image = isSafePublicShareImageUrl(input.avatarUrl)
    ? input.avatarUrl
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${display} (@${username})`,
    url: `${origin}${path}`,
    mainEntity: {
      "@type": "Person",
      name: display,
      alternateName: `@${username}`,
      url: `${origin}${path}`,
      ...(input.bio?.trim()
        ? { description: truncateForMeta(input.bio, 300) }
        : {}),
      ...(image ? { image } : {}),
    },
  };
}

export function buildSocialMediaPostingJsonLd(input: {
  id: number;
  content: string;
  createdAt?: string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  imageUrl?: string | null;
  origin?: string;
}): JsonLdRecord | null {
  if (!Number.isInteger(input.id) || input.id <= 0) return null;
  const origin = input.origin ?? getSiteUrl();
  const path = `/life?post=${input.id}`;
  const text = input.content.replace(/\s+/g, " ").trim();
  const headline = truncateForMeta(text || `UM Life post on ${BRAND.name}`, 70);
  const author =
    input.authorName?.trim() ||
    input.authorUsername?.replace(/^@+/, "").trim() ||
    "";
  const image = isSafePublicShareImageUrl(input.imageUrl)
    ? input.imageUrl
    : undefined;
  const published = input.createdAt
    ? Date.parse(input.createdAt)
    : Number.NaN;

  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline,
    ...(text ? { articleBody: truncateForMeta(text, 300) } : {}),
    url: `${origin}${path}`,
    mainEntityOfPage: `${origin}${path}`,
    ...(Number.isFinite(published)
      ? { datePublished: new Date(published).toISOString() }
      : {}),
    ...(author
      ? {
          author: {
            "@type": "Person",
            name: author,
            ...(input.authorUsername?.trim()
              ? {
                  url: `${origin}/profile/${input.authorUsername
                    .replace(/^@+/, "")
                    .toLowerCase()}`,
                }
              : {}),
          },
        }
      : {}),
    ...(image ? { image } : {}),
    publisher: { "@id": organizationId(origin) },
  };
}
