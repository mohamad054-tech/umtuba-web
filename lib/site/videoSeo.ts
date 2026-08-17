import type { Metadata } from "next";
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

/**
 * Truthful title from stored caption / article title / creator.
 * Does not invent a subject when the post has no text.
 */
export function truthfulVideoTitle(input: PublicVideoSeoInput): string {
  const article = input.articleTitle?.trim() ?? "";
  if (article) return truncateForMeta(article, 70);

  const caption = firstLine(input.caption ?? "");
  if (caption) return truncateForMeta(caption, 70);

  const creator =
    input.authorName?.trim() ||
    input.authorUsername?.replace(/^@+/, "").trim() ||
    "";
  if (creator) return `Video by ${creator}`;
  return `Video on ${BRAND.name}`;
}

export function truthfulVideoDescription(input: PublicVideoSeoInput): string {
  const caption = (input.caption ?? "").replace(/\s+/g, " ").trim();
  if (caption) return truncateForMeta(caption, 160);

  const creator =
    input.authorName?.trim() ||
    input.authorUsername?.replace(/^@+/, "").trim() ||
    "";
  if (creator) {
    return truncateForMeta(`A video by ${creator} on ${BRAND.name}.`, 160);
  }
  return truncateForMeta(`A video on ${BRAND.name}.`, 160);
}

export function buildWatchPostMetadata(input: PublicVideoSeoInput): Metadata {
  const path = buildWatchPostPath(input.id);
  const title = truthfulVideoTitle(input);
  const description = truthfulVideoDescription(input);
  const creator =
    input.authorName?.trim() ||
    input.authorUsername?.replace(/^@+/, "").trim() ||
    undefined;

  const meta = buildPageMetadata({
    title,
    description,
    path,
    index: "index",
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
  origin: string
): VideoObjectJsonLd {
  const path = buildWatchPostPath(input.id);
  const pageUrl = `${origin}${path}`;
  const duration = iso8601DurationFromMs(input.durationMs);
  const creator =
    input.authorName?.trim() ||
    input.authorUsername?.replace(/^@+/, "").trim() ||
    "";
  const uploadDate = Number.isFinite(Date.parse(input.createdAt))
    ? new Date(input.createdAt).toISOString()
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: truthfulVideoTitle(input),
    description: truthfulVideoDescription(input),
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
