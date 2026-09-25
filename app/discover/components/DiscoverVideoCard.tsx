"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../components/i18n";
import type { WatchProgressEvent } from "../../components/video/VideoPlayer";
import { APP_ROUTES } from "../../lib/nav";
import { recordFeedViewOnce } from "../../lib/video/recordFeedView";
import {
  createEmptyWatchSession,
  flushWatchSession,
  mergeWatchProgress,
  type WatchSessionSnapshot,
} from "../../lib/video/recordWatchSignal";
import { createConsecutiveWatchTracker } from "../../../lib/video/watchHidePolicy";
import { rememberQualifiedWatch } from "../../../lib/video/rememberQualifiedWatch";
import type { DiscoverStats, DiscoverVideo } from "../types";
import DiscoverActionRail from "./DiscoverActionRail";
import DiscoverCaption from "./DiscoverCaption";
import DiscoverCreatorInfo, { DiscoverCreatorAvatar } from "./DiscoverCreatorInfo";
import DiscoverLinkChip from "./DiscoverLinkChip";
import DiscoverNativeVideo from "./DiscoverNativeVideo";

type DiscoverVideoCardProps = {
  video: DiscoverVideo;
  active: boolean;
  viewerId?: string | null;
  /** Shared session dedupe for view recording (feed-owned). */
  sessionViews?: Set<number>;
  onComment: () => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
  onFollowChange?: (creatorId: string, following: boolean) => void;
  onSrcChange?: (src: string) => void;
  slideRef?: (node: HTMLElement | null) => void;
  onDeleted?: (postId: number) => void;
  onHideFromFeed?: (postId: number) => void;
  onCaptionChange?: (caption: string) => void;
  onUiLockChange?: (locked: boolean) => void;
  onEnded?: () => void;
};

export default function DiscoverVideoCard({
  video,
  active,
  viewerId = null,
  sessionViews,
  onComment,
  onStatsChange,
  onFlagsChange,
  onFollowChange,
  onSrcChange,
  slideRef,
  onDeleted,
  onHideFromFeed,
  onCaptionChange,
  onUiLockChange,
  onEnded,
}: DiscoverVideoCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [localViews] = useState(() => new Set<number>());
  const viewsSet = sessionViews ?? localViews;
  const postId = Number(video.id);
  const sessionRef = useRef<WatchSessionSnapshot | null>(null);
  const wasActiveRef = useRef(false);
  const hideTrackerRef = useRef(createConsecutiveWatchTracker({ onQualified: () => {} }));

  useEffect(() => {
    if (!active || !Number.isInteger(postId) || postId <= 0) {
      return;
    }

    void recordFeedViewOnce(postId, viewsSet, "discover").then((result) => {
      if (result.ok && result.counted) {
        onStatsChange?.({ views: result.views });
      }
    });
  }, [active, onStatsChange, postId, viewsSet]);

  useEffect(() => {
    if (!Number.isInteger(postId) || postId <= 0) {
      return;
    }

    if (active && !wasActiveRef.current) {
      sessionRef.current = createEmptyWatchSession(postId, "discover");
      if (video.likedByMe) {
        sessionRef.current.engagement.liked = true;
      }
      if (video.savedByMe) {
        sessionRef.current.engagement.saved = true;
      }
    }

    if (!active && wasActiveRef.current) {
      const session = sessionRef.current;
      sessionRef.current = null;
      void flushWatchSession(session);
    }

    wasActiveRef.current = active;
  }, [active, postId, video.likedByMe, video.savedByMe]);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      void flushWatchSession(session);
    };
  }, []);

  useEffect(() => {
    hideTrackerRef.current = createConsecutiveWatchTracker({
      onQualified: () => {
        if (Number.isInteger(postId) && postId > 0) {
          void rememberQualifiedWatch(postId);
        }
      },
    });
  }, [postId]);

  useEffect(() => {
    if (!active) {
      hideTrackerRef.current.reset();
    }
  }, [active]);

  function handleWatchProgress(event: WatchProgressEvent) {
    if (!sessionRef.current) return;
    sessionRef.current = mergeWatchProgress(sessionRef.current, event);
    hideTrackerRef.current.ingest(event.currentTimeMs, active);
  }

  function handleFlagsChange(flags: {
    likedByMe?: boolean;
    savedByMe?: boolean;
  }) {
    if (sessionRef.current) {
      if (flags.likedByMe) {
        sessionRef.current.engagement.liked = true;
      }
      if (flags.savedByMe) {
        sessionRef.current.engagement.saved = true;
      }
    }
    onFlagsChange?.(flags);
  }

  function handleComment() {
    if (sessionRef.current) {
      sessionRef.current.engagement.commented = true;
    }
    onComment();
  }

  function handleTeaserOpen() {
    if (video.articleHref) {
      router.push(video.articleHref);
    }
  }

  return (
    <article
      ref={slideRef}
      data-video-id={video.id}
      className={`video-snap-slide relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black ${
        active ? "watch-overlay-enter" : ""
      }`}
      onDoubleClick={video.articleHref ? handleTeaserOpen : undefined}
    >
      <DiscoverNativeVideo
        src={video.src}
        poster={video.poster}
        active={active}
        label={video.caption}
        postId={Number.isInteger(postId) && postId > 0 ? postId : null}
        onSrcChange={onSrcChange}
        onWatchProgress={
          Number.isInteger(postId) && postId > 0
            ? handleWatchProgress
            : undefined
        }
        onEnded={onEnded}
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        <div className="feed-caption-safe z-10">
          <div className="min-w-0 space-y-2">
            <DiscoverLinkChip link={video.link} />
            <DiscoverCreatorInfo
              creator={video.creator}
              viewerId={viewerId}
              postId={video.id}
              articleId={video.articleId}
              onFollowChange={onFollowChange}
            />
            {video.removed ? (
              <p className="pointer-events-none inline-flex rounded-full border border-amber-300/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
                {t("feed.postRemoved")}
              </p>
            ) : null}
            <DiscoverCaption
              title={video.title || video.caption}
              caption={video.caption}
              hashtags={video.hashtags}
              articleHref={video.articleHref}
              articleTitle={video.articleTitle}
              views={video.stats.views}
            />
          </div>

          <div
            className="feed-side-rail pointer-events-auto end-3 flex flex-col items-center gap-4"
            data-home-action-rail="right"
          >
            <DiscoverCreatorAvatar
              creator={video.creator}
              viewerId={viewerId}
              postId={video.id}
              articleId={video.articleId}
              onFollowChange={onFollowChange}
            />
            <DiscoverActionRail
              postId={postId}
              stats={video.stats}
              likedByMe={video.likedByMe}
              savedByMe={video.savedByMe}
              caption={video.caption}
              viewerId={viewerId}
              ownerUserId={video.creator.id}
              returnPath={`${APP_ROUTES.home}?post=${video.id}`}
              onComment={handleComment}
              onStatsChange={onStatsChange}
              onFlagsChange={handleFlagsChange}
              onDeleted={onDeleted}
              onHideFromFeed={onHideFromFeed}
              onCaptionChange={onCaptionChange}
              onUiLockChange={onUiLockChange}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
