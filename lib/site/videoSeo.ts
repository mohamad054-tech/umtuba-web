import type { Metadata } from "next";
import { translate } from "../i18n/translate";
import { DEFAULT_LOCALE, type AppLocale } from "../i18n/locales";
import { BRAND } from "./brand";
import { buildHreflangLanguages } from "./hreflang";
import {
  OG_ALT,
  OG_HEIGHT,
  OG_IMAGE_PATH,
  OG_WIDTH,
  buildPageMetadata,
  truncateForMeta,
} from "./metadata";

export const WATCH_POST_PATH = "/watch";
export const VIDEO_SITEMAP_PATH = "/video-sitemap.xml";
export const VIDEO_SITEMAP_LIMIT = 1000;

export type PublicVideoSeoInput = {
  id: number;
  caption: string | null;
  createdAt: string;
  durationMs: number | null;
  authorName: string | null;
  authorUsername: string | null;
  articleTitle: string | null;
  authorCity?: string | null;
  authorCountry?: string | null;
  hasThumbnail?: boolean;
};

export type WatchPostQuery = {
  post?: string | null;
  id?: string | null;
};

export function buildWatchPostPath(postId: number): string {
  return `${WATCH_POST_PATH}?post=${postId}`;
}

export function parsePublicPostId(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const id = Number(raw.trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** ISO 8601 duration from milliseconds. Omits when duration is unknown. */
export function iso8601DurationFromMs(
  durationMs: number | null | undefined
): string | null {
  if (
    typeof durationMs !== "number" ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return null;
  }
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `PT${hours}H${minutes}M${seconds}S`;
  }
  if (minutes > 0) {
    return `PT${minutes}M${seconds}S`;
  }
  return `PT${seconds}S`;
}

export function sitemapDurationSeconds(
  durationMs: number | null | undefined
): number | null {
  if (
    typeof durationMs !== "number" ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    return null;
  }
  return Math.round(durationMs / 1000);
}

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0]?.trim() ?? "";
}

export function readWatchPostQuery(params: WatchPostQuery): {
  provided: boolean;
  postId: number | null;
} {
  const provided = params.post != null || params.id != null;
  return {
    provided,
    postId: parsePublicPostId(params.post ?? params.id ?? null),
  };
}

export function normalizeSeoUsername(
  username: string | null | undefined
): string {
  return username?.replace(/^@+/, "").trim() ?? "";
}

export function authorLocationLine(input: PublicVideoSeoInput): string {
  const city = input.authorCity?.trim() ?? "";
  const country = input.authorCountry?.trim() ?? "";
  if (city && country) return `${city}, ${country}`;
  return city || country;
}

export function hasVideoSeoCaption(input: PublicVideoSeoInput): boolean {
  const article = input.articleTitle?.trim() ?? "";
  if (article) return true;
  return Boolean(firstLine(input.caption ?? ""));
}

/** Empty caption and no poster: keep the Watch URL out of the index and sitemap. */
export function shouldIndexPublicVideo(input: PublicVideoSeoInput): boolean {
  if (hasVideoSeoCaption(input)) return true;
  return Boolean(input.hasThumbnail);
}

function authorDisplayName(input: PublicVideoSeoInput): string {
  return (
    input.authorName?.trim() ||
    normalizeSeoUsername(input.authorUsername) ||
    ""
  );
}

/**
 * Truthful title from stored caption / article title / creator.
 * Empty captions use a localized author identity, not "Untitled" / "Video by".
 */
export function truthfulVideoTitle(
  input: PublicVideoSeoInput,
  locale: AppLocale = DEFAULT_LOCALE
): string {
  const article = input.articleTitle?.trim() ?? "";
  if (article) return truncateForMeta(article, 70);

  const caption = firstLine(input.caption ?? "");
  if (caption) return truncateForMeta(caption, 70);

  const name = authorDisplayName(input);
  const username = normalizeSeoUsername(input.authorUsername);
  if (name && username) {
    return truncateForMeta(
      translate(locale, "video.seo.titleByAuthor", {
        values: { name, username },
      }),
      70
    );
  }
  if (name) {
    return truncateForMeta(
      translate(locale, "video.seo.titleByName", { values: { name } }),
      70
    );
  }
  return `Video on ${BRAND.name}`;
}

export function truthfulVideoDescription(
  input: PublicVideoSeoInput,
  locale: AppLocale = DEFAULT_LOCALE
): string {
  const caption = (input.caption ?? "").replace(/\s+/g, " ").trim();
  if (caption) return truncateForMeta(caption, 160);

  const name = authorDisplayName(input);
  const username = normalizeSeoUsername(input.authorUsername);
  const location = authorLocationLine(input);
  if (name && username && location) {
    return truncateForMeta(
      translate(locale, "video.seo.descriptionByAuthorLocation", {
        values: { name, username, location },
      }),
      160
    );
  }
  if (name && username) {
    return truncateForMeta(
      translate(locale, "video.seo.descriptionByAuthor", {
        values: { name, username },
      }),
      160
    );
  }
  if (name) {
    return truncateForMeta(
      translate(locale, "video.seo.descriptionByName", { values: { name } }),
      160
    );
  }
  return truncateForMeta(`A video on ${BRAND.name}.`, 160);
}

/** Ineligible / unpublished / unreadable Watch URLs stay noindex with a self canonical. */
export function buildWatchUnavailableMetadata(postId: number): Metadata {
  return buildPageMetadata({
    title: "Watch",
    description: `This video is unavailable on ${BRAND.name}.`,
    path: buildWatchPostPath(postId),
    index: "noindex",
    hreflang: false,
  });
}

export function buildWatchPostMetadata(
  input: PublicVideoSeoInput,
  locale: AppLocale = DEFAULT_LOCALE
): Metadata {
  const path = buildWatchPostPath(input.id);
  const title = truthfulVideoTitle(input, locale);
  const description = truthfulVideoDescription(input, locale);
  const creator = authorDisplayName(input) || undefined;
  const indexable = shouldIndexPublicVideo(input);

  const meta = buildPageMetadata({
    title,
    description,
    path,
    index: indexable ? "index" : "noindex",
    hreflang: indexable,
    locale,
    openGraphType: "video.other",
    imageUrl: OG_IMAGE_PATH,
    imageAlt: OG_ALT,
  });

  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "video.other",
      url: path,
      ...(creator ? { authors: [creator] } : {}),
    },
  };
}

export type VideoObjectJsonLd = {
  "@context": "https://schema.org";
  "@type": "VideoObject";
  name: string;
  description: string;
  thumbnailUrl: string[];
  uploadDate?: string;
  duration?: string;
  embedUrl: string;
  url: string;
  author?: {
    "@type": "Person";
    name: string;
  };
};

export function buildVideoObjectJsonLd(
  input: PublicVideoSeoInput,
  origin: string,
  locale: AppLocale = DEFAULT_LOCALE
): VideoObjectJsonLd {
  const path = buildWatchPostPath(input.id);
  const pageUrl = `${origin}${path}`;
  const duration = iso8601DurationFromMs(input.durationMs);
  const creator = authorDisplayName(input);
  const uploadDate = Number.isFinite(Date.parse(input.createdAt))
    ? new Date(input.createdAt).toISOString()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: truthfulVideoTitle(input, locale),
    description: truthfulVideoDescription(input, locale),
    thumbnailUrl: [`${origin}${OG_IMAGE_PATH}`],
    ...(uploadDate ? { uploadDate } : {}),
    ...(duration ? { duration } : {}),
    embedUrl: pageUrl,
    url: pageUrl,
    ...(creator
      ? { author: { "@type": "Person", name: creator } }
      : {}),
  };
}

export function watchHreflangLanguages(postId?: number | null) {
  const path =
    postId && postId > 0 ? buildWatchPostPath(postId) : WATCH_POST_PATH;
  return buildHreflangLanguages(path);
}

export { OG_IMAGE_PATH, OG_WIDTH, OG_HEIGHT, OG_ALT };
