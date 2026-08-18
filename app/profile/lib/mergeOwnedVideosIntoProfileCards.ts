import type { ContentCardCreator, ContentCardViewModel } from "../../../lib/content/cards";
import { isImagePreviewSrc } from "../../../lib/content/cards";
import type { ProfileContentVideo } from "../../../lib/supabase/profileContent";

const VIDEO_GRADIENT =
  "bg-gradient-to-br from-violet-700/70 via-blue-900/70 to-[#0b1024]";

function cardPostId(card: ContentCardViewModel): number | null {
  if (
    typeof card.discoveryPostId === "number" &&
    Number.isInteger(card.discoveryPostId) &&
    card.discoveryPostId > 0
  ) {
    return card.discoveryPostId;
  }
  const parsed = Number(card.sourceEntityId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function videoToCard(
  video: ProfileContentVideo,
  creator: ContentCardCreator
): ContentCardViewModel {
  const sourceEntityId = String(video.postId);
  const previewSrc = isImagePreviewSrc(video.thumbnailUrl)
    ? video.thumbnailUrl
    : null;
  return {
    id: `owned-video-${video.postId}`,
    registryId: `owned-video-${video.postId}`,
    kind: "video",
    sourceEntityId,
    creator,
    title: video.title,
    summary: null,
    canonicalHref: video.href,
    publishedAt: video.createdAt,
    visibility: "public",
    publishState: "published",
    preview: {
      recipe: previewSrc ? "image" : "gradient",
      src: previewSrc,
      poster: previewSrc,
      aspect: "9:16",
      alt: video.title,
      gradientClass: VIDEO_GRADIENT,
      durationLabel: video.durationLabel ?? null,
    },
    discoveryPostId: video.postId,
    discoveryMode: "native_video",
    hasGeneratedTeaser: false,
    featured: false,
    pinned: false,
    badges: ["independent_video"],
    cta: {
      verb: "watch",
      label: "Watch",
      href: video.href,
    },
    presentationVariant: "video",
    layoutVariant: "profile",
  };
}

/**
 * Profile All defaults to content_registry. Ready owned videos that were never
 * indexed still belong on the owner's All tab — merge them without duplicating
 * registry rows or inventing other users' content.
 */
export function mergeOwnedVideosIntoProfileCards(
  cards: ContentCardViewModel[],
  videos: ProfileContentVideo[],
  creator: ContentCardCreator
): ContentCardViewModel[] {
  const seen = new Set<number>();
  for (const card of cards) {
    const postId = cardPostId(card);
    if (postId != null) {
      seen.add(postId);
    }
  }

  const extras = videos
    .filter((video) => Number.isInteger(video.postId) && video.postId > 0)
    .filter((video) => !seen.has(video.postId))
    .map((video) => videoToCard(video, creator));

  return extras.length === 0 ? cards : [...cards, ...extras];
}
