"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  deleteStoryAction,
  getMyStoryViewersAction,
  recordStoryViewAction,
} from "../../actions/stories";
import { STORY_IMAGE_DURATION_MS } from "../../../lib/stories/constants";
import { STORY_ERRORS, storyUserMessage } from "../../../lib/stories/errors";
import type { StoryItem, StoryRailGroup, StoryViewerRow } from "../../../lib/stories/types";

type StoryViewerProps = {
  groups: StoryRailGroup[];
  startOwnerId: string;
  viewerId: string | null;
  onClose: () => void;
  onStoryViewed: (ownerId: string, storyId: string) => void;
  onStoryDeleted: (storyId: string) => void;
};

type FlatPointer = {
  groupIndex: number;
  storyIndex: number;
  story: StoryItem;
  group: StoryRailGroup;
};

function flattenGroups(groups: StoryRailGroup[]): FlatPointer[] {
  const out: FlatPointer[] = [];
  groups.forEach((group, groupIndex) => {
    group.stories.forEach((story, storyIndex) => {
      out.push({ groupIndex, storyIndex, story, group });
    });
  });
  return out;
}

export default function StoryViewer({
  groups,
  startOwnerId,
  viewerId,
  onClose,
  onStoryViewed,
  onStoryDeleted,
}: StoryViewerProps) {
  const flat = flattenGroups(groups);
  const startIndex = Math.max(
    0,
    flat.findIndex((f) => f.group.ownerId === startOwnerId)
  );

  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRow[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const recordedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef(0);

  const current = flat[index] ?? null;

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, []);

  const goTo = useCallback(
    (next: number) => {
      stopVideo();
      setMediaError(false);
      setMediaLoading(true);
      setProgress(0);
      elapsedRef.current = 0;
      setViewersOpen(false);
      setActionError(null);
      if (next < 0 || next >= flat.length) {
        onClose();
        return;
      }
      setIndex(next);
    },
    [flat.length, onClose, stopVideo]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => {
    if (progress > 0.15 || elapsedRef.current > 400) {
      stopVideo();
      setProgress(0);
      elapsedRef.current = 0;
      setRestartNonce((n) => n + 1);
      if (current?.story.mediaType === "video" && videoRef.current) {
        try {
          videoRef.current.currentTime = 0;
        } catch {
          /* ignore */
        }
        void videoRef.current.play().catch(() => undefined);
      }
      return;
    }
    goTo(index - 1);
  }, [current, goTo, index, progress, stopVideo]);

  // Record view once per story open.
  useEffect(() => {
    if (!current || !viewerId) return;
    const storyId = current.story.id;
    if (recordedRef.current.has(storyId)) return;
    if (current.story.ownerId === viewerId) {
      recordedRef.current.add(storyId);
      return;
    }
    recordedRef.current.add(storyId);
    void recordStoryViewAction(storyId).then((result) => {
      if (result.ok) {
        onStoryViewed(current.group.ownerId, storyId);
      }
    });
  }, [current, onStoryViewed, viewerId]);

  // Image progress timer.
  useEffect(() => {
    if (!current || current.story.mediaType !== "image" || paused || mediaError) {
      return;
    }
    startedAtRef.current = performance.now() - elapsedRef.current;

    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      elapsedRef.current = elapsed;
      const ratio = Math.min(1, elapsed / STORY_IMAGE_DURATION_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [current, goNext, mediaError, paused, restartNonce]);

  // Keyboard
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      stopVideo();
    };
  }, [stopVideo]);

  const handleDelete = () => {
    if (!current || !current.group.isOwn) return;
    startTransition(async () => {
      setActionError(null);
      const result = await deleteStoryAction(current.story.id);
      if (!result.ok) {
        setActionError(storyUserMessage(result.message, STORY_ERRORS.deleteFailed));
        return;
      }
      onStoryDeleted(current.story.id);
      goNext();
    });
  };

  const openViewers = () => {
    if (!current || !current.group.isOwn) return;
    setViewersOpen(true);
    setViewersLoading(true);
    void getMyStoryViewersAction(current.story.id).then((result) => {
      setViewersLoading(false);
      if (!result.ok) {
        setActionError(storyUserMessage(result.message, STORY_ERRORS.viewersFailed));
        setViewers([]);
        return;
      }
      setViewers(result.viewers);
    });
  };

  if (!current) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black text-white">
        <p className="text-sm font-bold text-white/70">No stories to show.</p>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"
        >
          Close
        </button>
      </div>
    );
  }

  const { story, group } = current;
  const groupStories = group.stories;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black text-white"
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) return;
        const end = e.changedTouches[0]?.clientX ?? start;
        const delta = end - start;
        if (Math.abs(delta) < 50) return;
        if (delta < 0) goNext();
        else goPrev();
      }}
    >
      <div className="absolute inset-0">
        {mediaError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-bold text-white/80">
              Unable to load this story media.
            </p>
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"
            >
              Next
            </button>
          </div>
        ) : story.mediaType === "video" ? (
          <video
            key={story.id}
            ref={videoRef}
            src={story.mediaUrl ?? undefined}
            className="h-full w-full object-contain"
            playsInline
            autoPlay
            onLoadedData={() => {
              setMediaLoading(false);
              setProgress(0);
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (!el.duration || !Number.isFinite(el.duration)) return;
              setProgress(Math.min(1, el.currentTime / el.duration));
            }}
            onEnded={goNext}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={story.id}
            src={story.mediaUrl ?? undefined}
            alt=""
            className="h-full w-full object-contain"
            onLoad={() => setMediaLoading(false)}
            onError={() => {
              setMediaLoading(false);
              setMediaError(true);
            }}
          />
        )}

        {mediaLoading && !mediaError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : null}
      </div>

      {/* Progress bars for current owner's stories */}
      <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {groupStories.map((s, i) => {
            const filled =
              i < current.storyIndex
                ? 1
                : i === current.storyIndex
                  ? progress
                  : 0;
            return (
              <div
                key={s.id}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <div
                  className="h-full bg-white transition-[width] duration-75"
                  style={{ width: `${filled * 100}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-black">
            {group.owner.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.owner.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              group.owner.avatar_initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {group.owner.username
                ? `@${group.owner.username}`
                : group.owner.full_name || "UMTUBA"}
            </p>
            {story.caption ? (
              <p className="truncate text-xs text-white/70">{story.caption}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"
            aria-label="Close story"
          >
            Close
          </button>
        </div>
      </div>

      {/* Tap zones */}
      <button
        type="button"
        className="absolute inset-y-0 left-0 z-10 w-1/3"
        aria-label="Previous story"
        onClick={goPrev}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 w-2/3"
        aria-label="Next story"
        onClick={goNext}
      />

      {/* Owner chrome */}
      {group.isOwn ? (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10">
          <button
            type="button"
            onClick={openViewers}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold"
          >
            {story.viewCount ?? 0} views
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-full border border-rose-300/30 bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-100 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ) : null}

      {actionError ? (
        <p
          className="absolute bottom-24 left-1/2 z-30 max-w-sm -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-center text-xs font-bold text-rose-200"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {viewersOpen ? (
        <div className="absolute inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0a0a18] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black">Viewers</h3>
            <button
              type="button"
              onClick={() => setViewersOpen(false)}
              className="text-xs font-bold text-white/60"
            >
              Close
            </button>
          </div>
          {viewersLoading ? (
            <p className="text-xs text-white/50">Loading…</p>
          ) : viewers.length === 0 ? (
            <p className="text-xs text-white/50">No views yet.</p>
          ) : (
            <ul className="space-y-2">
              {viewers.map((v) => (
                <li key={v.viewerId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[10px] font-black">
                    {v.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      v.avatarInitial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {v.username ? `@${v.username}` : v.fullName || "Viewer"}
                    </p>
                    <p className="text-[10px] text-white/45">
                      {new Date(v.lastViewedAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
