import type { Metadata } from "next";
import {
  BRAND,
  BRAND_KEYWORDS,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  TITLE_TEMPLATE,
} from "./brand";
import { getSiteUrl } from "./siteUrl";

const OG_IMAGE_PATH = "/opengraph-image.png";
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_ALT = `${BRAND.name} — ${BRAND.tagline}`;

export type PageIndexPolicy = "index" | "noindex";

export type BuildPageMetadataInput = {
  title: string;
  description: string;
  /** Pathname for canonical (e.g. `/discover`). */
  path: string;
  index?: PageIndexPolicy;
  /** Override Open Graph type (default `website`). */
  openGraphType?: "website" | "profile";
  /** Optional absolute image URL for OG/Twitter (e.g. public avatar). */
  imageUrl?: string | null;
  imageAlt?: string;
};

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.length > 1 && withSlash.endsWith("/")
    ? withSlash.slice(0, -1)
    : withSlash;
}

function robotsFor(index: PageIndexPolicy): NonNullable<Metadata["robots"]> {
  if (index === "noindex") {
    return {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    };
  }
  return {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  };
}

function shareImages(imageUrl: string | null | undefined, imageAlt: string) {
  const url = imageUrl?.trim() || OG_IMAGE_PATH;
  return {
    url,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    alt: imageAlt,
  };
}

/**
 * Build route-level Metadata with canonical, OG, Twitter, and robots.
 * Titles are segment titles; the root layout applies `%s | UMTUBA`.
 */
export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const path = normalizePath(input.path);
  const index = input.index ?? "index";
  const image = shareImages(input.imageUrl, input.imageAlt ?? OG_ALT);
  const ogType = input.openGraphType ?? "website";

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: path,
    },
    robots: robotsFor(index),
    openGraph: {
      type: ogType,
      locale: "en_US",
      url: path,
      siteName: BRAND.name,
      title: input.title,
      description: input.description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [
        {
          url: image.url,
          alt: image.alt,
          width: image.width,
          height: image.height,
        },
      ],
    },
  };
}

/** Global root layout metadata. */
export function buildRootMetadata(
  source: Record<string, string | undefined> = process.env
): Metadata {
  const metadataBase = new URL(getSiteUrl(source));
  const image = shareImages(null, OG_ALT);

  return {
    metadataBase,
    title: {
      default: DEFAULT_TITLE,
      template: TITLE_TEMPLATE,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: BRAND.name,
    authors: [{ name: BRAND.name }],
    creator: BRAND.name,
    publisher: BRAND.name,
    keywords: [...BRAND_KEYWORDS],
    category: "social",
    referrer: "origin-when-cross-origin",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: BRAND.name,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [
        {
          url: image.url,
          alt: image.alt,
          width: image.width,
          height: image.height,
        },
      ],
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

const BIO_MAX = 160;

export function truncateForMeta(text: string, max = BIO_MAX): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Avatar URLs safe for long-lived social crawlers.
 * Rejects signed/expiring query params; requires absolute http(s).
 */
export function isSafePublicShareImageUrl(
  raw: string | null | undefined
): raw is string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return false;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const search = parsed.search.toLowerCase();
  if (
    search.includes("token=") ||
    search.includes("signature=") ||
    search.includes("x-amz-") ||
    search.includes("expires=") ||
    search.includes("x-goog-")
  ) {
    return false;
  }

  return true;
}

export type PublicProfileMetaInput = {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

/**
 * Public-safe profile sharing metadata.
 * Excludes email, UM Points, location, and other non-public fields.
 */
export function buildPublicProfileMetadata(
  input: PublicProfileMetaInput | null
): Metadata {
  if (!input?.username?.trim()) {
    return buildPageMetadata({
      title: "Profile not found",
      description: `This ${BRAND.name} profile is unavailable.`,
      path: "/profile",
      index: "noindex",
    });
  }

  const username = input.username.trim().replace(/^@+/, "").toLowerCase();
  const display =
    (input.displayName && input.displayName.trim()) || username;
  const title = `${display} (@${username})`;
  const bio = input.bio?.trim()
    ? truncateForMeta(input.bio)
    : `${display} on ${BRAND.name} — ${BRAND.tagline}.`;
  const avatar = isSafePublicShareImageUrl(input.avatarUrl)
    ? input.avatarUrl
    : null;

  return buildPageMetadata({
    title,
    description: bio,
    path: `/profile/${username}`,
    index: "index",
    openGraphType: "profile",
    imageUrl: avatar,
    imageAlt: avatar
      ? `${display} on ${BRAND.name}`
      : OG_ALT,
  });
}

export { OG_IMAGE_PATH, OG_WIDTH, OG_HEIGHT, OG_ALT };
