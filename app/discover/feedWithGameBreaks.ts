import {
  GAME_ARTWORK_SLUGS,
  type PlayableGameSlug,
} from "../../lib/games/play/catalog";
import type { DiscoverVideo } from "./types";

/** One game card after every full dozen of real videos. */
export const GAME_BREAK_EVERY = 12;

export type HomeFeedItem =
  | { kind: "video"; key: string; video: DiscoverVideo; videoIndex: number }
  | { kind: "game"; key: string; slug: PlayableGameSlug; slot: number };

export function gameBreakSlug(slot: number): PlayableGameSlug {
  const index = ((slot % GAME_ARTWORK_SLUGS.length) + GAME_ARTWORK_SLUGS.length) %
    GAME_ARTWORK_SLUGS.length;
  return GAME_ARTWORK_SLUGS[index]!;
}

/** Stable slot: the same break index always picks the same game with tile art. */
export function buildHomeFeedItems(videos: readonly DiscoverVideo[]): HomeFeedItem[] {
  const items: HomeFeedItem[] = [];
  let slot = 0;

  videos.forEach((video, videoIndex) => {
    items.push({
      kind: "video",
      key: video.id,
      video,
      videoIndex,
    });
    if ((videoIndex + 1) % GAME_BREAK_EVERY === 0) {
      items.push({
        kind: "game",
        key: `game-break-${slot}`,
        slug: gameBreakSlug(slot),
        slot,
      });
      slot += 1;
    }
  });

  return items;
}

/** Feed index of a real video after game cards that sit in front of it. */
export function feedIndexForVideo(videoIndex: number): number {
  if (videoIndex < 0) return 0;
  return videoIndex + Math.floor(videoIndex / GAME_BREAK_EVERY);
}
