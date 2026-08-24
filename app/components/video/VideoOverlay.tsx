"use client";

import Link from "next/link";
import { useTranslation } from "../i18n";
import FollowButton from "../social/FollowButton";
import type { DiscoverStats } from "../../discover/types";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildLifePostHref,
} from "../../lib/nav";
import { allowWatchPrototypePanels } from "../../lib/product/surfaceGates";
import {
  localizedLocationCountry,
  localizedVideoTitle,
} from "../../watch/lib/mapWatchVideo";
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
}: VideoOverlayProps) {
  const { t } = useTranslation();
  const prototypePanelsAllowed = allowWatchPrototypePanels();
  const peerUserId = video.author.id;
  const profileHref = buildCreatorProfileHref({
    username: video.author.username,
    articleId: video.articleId,
  });
  const returnPath =
    video.postId != null
      ? `${APP_ROUTES.watch}?post=${video.postId}`
      : APP_ROUTES.watch;
  const hasLinkedArticle = Boolean(video.articleId && video.articleHref);
  const untitled = t("video.untitled");
  const displayTitle = localizedVideoTitle(video.title, untitled);
  const displayCaption = localizedVideoTitle(video.caption, untitled);
  const displayCountry = localizedLocationCountry(
    video.location.country,
    t("discover.worldwide")
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

      <div className="watch-overlay-enter relative z-10 flex items-end justify-between gap-3 p-5 pb-7 md:gap-4 md:p-6 md:pb-8">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Link
              href={profileHref}
              className="pointer-events-auto watch-focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-black text-black shadow-[0_0_24px_rgba(255,255,255,0.18)]"
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
              <p className="truncate text-sm text-white/55">
                {video.author.username}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-black text-white md:text-[15px]">
              {displayTitle}
            </p>
            {hasLinkedArticle ? (
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                {t("watch.linkedArticle")}
              </p>
            ) : displayCaption !== displayTitle ? (
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-white/80">
                {displayCaption}
              </p>
            ) : null}
            {video.postId != null ? (
              <Link
                href={buildLifePostHref(video.postId)}
                className="pointer-events-auto watch-focus-ring mt-2 inline-flex text-sm font-bold text-sky-200 underline-offset-2 hover:text-white hover:underline"
              >
                {t("watch.readOnUmLife")}
              </Link>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              <span aria-hidden>📍</span>
              {video.location.city}, {displayCountry}
            </span>
            {prototypePanelsAllowed ? (
              <button
                type="button"
                onClick={() => onOpenPanel("explore-city")}
                disabled={transitionLocked}
                className="pointer-events-auto watch-focus-ring rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1.5 font-bold text-blue-100 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("home.exploreCity")}
              </button>
            ) : null}
          </div>

          <p className="flex items-center gap-2 text-xs text-white/55">
            <span aria-hidden>♪</span>
            <span className="truncate">{video.music}</span>
          </p>

          {prototypePanelsAllowed ? (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-purple-200/80">
                {t("watch.aiSummary")}
              </p>
              <p className="text-sm leading-6 text-white/75">
                {video.aiSummary ===
                "Watch how this post travels — open Post Journey for live reach."
                  ? t("watch.aiSummaryBody")
                  : video.aiSummary}
              </p>
              <button
                type="button"
                onClick={() => onOpenPanel("ai")}
                disabled={transitionLocked}
                className="pointer-events-auto watch-focus-ring text-left text-xs font-bold text-white/55 underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
              >
                {t("watch.openAiPanel")}
              </button>
            </div>
          ) : null}

          <ShopBadge
            count={shopProductCount}
            disabled={transitionLocked}
            expanded={shopShelfOpen}
            onOpen={() => onOpenPanel("shop")}
          />

          <button
            type="button"
            onClick={() => onPostJourney(video)}
            disabled={transitionLocked}
            aria-busy={transitionLocked}
            className="pointer-events-auto watch-focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-black text-black shadow-[0_12px_40px_rgba(255,255,255,0.18)] transition hover:scale-[1.015] hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 md:w-auto md:min-w-[220px]"
          >
            <span aria-hidden>🌍</span>
            {transitionLocked ? t("watch.openingJourney") : t("watch.postJourney")}
          </button>
        </div>

        <div className="pointer-events-auto">
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
          />
        </div>
      </div>
    </div>
  );
}
