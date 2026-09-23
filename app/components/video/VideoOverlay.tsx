"use client";

import Link from "next/link";
import { useTranslation } from "../i18n";
import FollowButton from "../social/FollowButton";
import type { DiscoverStats } from "../../discover/types";
import { APP_ROUTES, buildCreatorProfileHref } from "../../lib/nav";
import { localizedVideoTitle } from "../../watch/lib/mapWatchVideo";
import type { WatchVideo } from "../../watch/types";
import type { WatchPanelId } from "./watchTypes";
import VideoActionRail from "./VideoActionRail";
import ShopBadge from "./commerce/ShopBadge";

type VideoOverlayProps = {
  video: WatchVideo;
  viewerId?: string | null;
  transitionLocked?: boolean;
  shopProductCount?: number;
  shopShelfOpen?: boolean;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
  onPostJourney: (video: WatchVideo) => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
  onFollowChange?: (authorId: string, following: boolean) => void;
  onDeleted?: (postId: number) => void;
  onHideFromFeed?: (postId: number) => void;
  onCaptionChange?: (caption: string) => void;
  onUiLockChange?: (locked: boolean) => void;
};

export default function VideoOverlay({
  video,
  viewerId = null,
  transitionLocked = false,
  shopProductCount = 0,
  shopShelfOpen = false,
  onOpenPanel,
  onPostJourney,
  onStatsChange,
  onFlagsChange,
  onFollowChange,
  onDeleted,
  onHideFromFeed,
  onCaptionChange,
  onUiLockChange,
}: VideoOverlayProps) {
  const { t } = useTranslation();
  const peerUserId = video.author.id;
  const profileHref = buildCreatorProfileHref({
    username: video.author.username,
    articleId: video.articleId,
  });
  const returnPath =
    video.postId != null
      ? `${APP_ROUTES.watch}?post=${video.postId}`
      : APP_ROUTES.watch;
  const untitled = t("video.untitled");
  const displayTitle = localizedVideoTitle(video.title, untitled);

  const summaryBody =
    video.aiSummary ===
    "Watch how this post travels — open Post Journey for live reach."
      ? t("watch.aiSummaryBody")
      : video.aiSummary;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      <div className="watch-overlay-enter feed-caption-safe z-10">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href={profileHref}
              className="pointer-events-auto watch-focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-black text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]"
              aria-label={`Open ${video.author.name}'s profile`}
            >
              {video.author.avatar}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={profileHref}
                  className="pointer-events-auto truncate text-base font-black tracking-tight transition hover:text-white/85"
                >
                  {video.author.name}
                </Link>
                {peerUserId ? (
                  <div className="pointer-events-auto">
                    <FollowButton
                      targetUserId={peerUserId}
                      viewerId={viewerId}
                      initialFollowing={Boolean(video.author.isFollowing)}
                      returnPath={returnPath}
                      size="sm"
                      followingClassName="border border-white/20 bg-white/10 text-white/80"
                      idleClassName="border border-sky-300/35 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"
                      onFollowChange={(snapshot) => {
                        onFollowChange?.(peerUserId, snapshot.following);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {video.removed ? (
            <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
              {t("feed.postRemoved")}
            </p>
          ) : null}
          <p className="truncate text-sm font-black text-white">{displayTitle}</p>

          <p className="flex items-center gap-2 text-xs text-white/70">
            <span aria-hidden>♪</span>
            <span className="truncate">{video.music}</span>
          </p>

          {shopProductCount > 0 ? (
            <ShopBadge
              count={shopProductCount}
              disabled={transitionLocked}
              expanded={shopShelfOpen}
              onOpen={() => onOpenPanel("shop")}
            />
          ) : null}
        </div>

        <div className="feed-side-rail pointer-events-auto end-3">
          <VideoActionRail
            postId={video.postId}
            stats={video.stats}
            likedByMe={video.likedByMe}
            savedByMe={video.savedByMe}
            caption={video.caption}
            viewerId={viewerId}
            ownerUserId={video.author.id}
            persist={video.source === "supabase"}
            returnPath={returnPath}
            onOpenPanel={onOpenPanel}
            onStatsChange={onStatsChange}
            onFlagsChange={onFlagsChange}
            onDeleted={onDeleted}
            onHideFromFeed={onHideFromFeed}
            onCaptionChange={onCaptionChange}
            onUiLockChange={onUiLockChange}
            onJourney={
              transitionLocked ? undefined : () => onPostJourney(video)
            }
            journeyLabel={
              transitionLocked ? t("watch.openingJourney") : t("watch.postJourney")
            }
            summaryTitle={t("watch.aiSummary")}
            summaryBody={summaryBody}
          />
        </div>
      </div>
    </div>
  );
}
