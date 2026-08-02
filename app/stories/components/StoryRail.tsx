"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";
import { useStoriesRail } from "../hooks/useStoriesRail";
import type { StoryRailGroup } from "../../../lib/stories/types";

const StoryComposer = dynamic(() => import("./StoryComposer"), { ssr: false });
const StoryViewer = dynamic(() => import("./StoryViewer"), { ssr: false });

type StoryRailProps = {
  viewerId: string | null;
};

function AvatarRing({
  group,
  onOpen,
}: {
  group: StoryRailGroup;
  onOpen: () => void;
}) {
  const ringClass = group.hasUnread
    ? "bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-400"
    : "bg-white/25";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
      aria-label={`Open ${group.owner.username ? `@${group.owner.username}` : "story"}`}
    >
      <span className={`rounded-full p-[2px] ${ringClass}`}>
        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#0a0a18] text-sm font-black text-white ring-2 ring-[#050510]">
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
        </span>
      </span>
      <span className="w-full truncate text-center text-[10px] font-bold text-white/75">
        {group.isOwn
          ? "Your story"
          : group.owner.username
            ? `@${group.owner.username}`
            : group.owner.full_name || "Story"}
      </span>
    </button>
  );
}

export default function StoryRail({ viewerId }: StoryRailProps) {
  const enabled = Boolean(viewerId);
  const {
    groups,
    loading,
    error,
    refresh,
    markStoryViewedLocally,
    removeStoryLocally,
  } = useStoriesRail(enabled);

  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerOwnerId, setViewerOwnerId] = useState<string | null>(null);

  return (
    <section
      className="relative z-20 w-full shrink-0 border-b border-white/5 bg-black/20 px-3 py-2.5 backdrop-blur-md md:rounded-2xl md:border md:border-white/10"
      aria-label="Stories"
    >
      <div className="flex items-center gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {viewerId ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
            aria-label="Add story"
          >
            <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-dashed border-white/35 bg-white/5 text-2xl font-black text-sky-300">
              +
            </span>
            <span className="w-full truncate text-center text-[10px] font-bold text-white/75">
              Add Story
            </span>
          </button>
        ) : (
          <Link
            href={`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.discover)}`}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5"
            aria-label="Sign in to add a story"
          >
            <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-dashed border-white/35 bg-white/5 text-2xl font-black text-sky-300">
              +
            </span>
            <span className="w-full truncate text-center text-[10px] font-bold text-white/75">
              Add Story
            </span>
          </Link>
        )}

        {loading && groups.length === 0 ? (
          <div className="flex items-center gap-3 pl-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/10"
              />
            ))}
          </div>
        ) : null}

        {groups.map((group) => (
          <AvatarRing
            key={group.ownerId}
            group={group}
            onOpen={() => setViewerOwnerId(group.ownerId)}
          />
        ))}

        {!loading && enabled && groups.length === 0 ? (
          <p className="pl-1 text-xs font-medium text-white/45">
            Follow creators to see their stories here.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-amber-200/90">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full bg-white/10 px-2 py-0.5"
          >
            Retry
          </button>
        </div>
      ) : null}

      {composerOpen ? (
        <StoryComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onCreated={() => void refresh()}
        />
      ) : null}

      {viewerOwnerId ? (
        <StoryViewer
          groups={groups}
          startOwnerId={viewerOwnerId}
          viewerId={viewerId}
          onClose={() => setViewerOwnerId(null)}
          onStoryViewed={markStoryViewedLocally}
          onStoryDeleted={(storyId) => {
            removeStoryLocally(storyId);
          }}
        />
      ) : null}
    </section>
  );
}
