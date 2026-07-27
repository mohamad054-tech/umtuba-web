"use client";

import Link from "next/link";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import FollowButton from "../../components/social/FollowButton";
import { APP_ROUTES, buildCreatorProfileHref, isUuid } from "../../lib/nav";
import type { DiscoverCreator, DiscoverLocation } from "../types";

type DiscoverCreatorInfoProps = {
  creator: DiscoverCreator;
  location: DiscoverLocation;
  /** Session viewer id from the Discover page (null if signed out). */
  viewerId?: string | null;
  /** Post id for auth return deep-link (`/discover?post=`). */
  postId?: string | number | null;
  /** Linked published article — opens profile with article prompt. */
  articleId?: string | null;
  onFollowChange?: (creatorId: string, following: boolean) => void;
};

export default function DiscoverCreatorInfo({
  creator,
  location,
  viewerId = null,
  postId = null,
  articleId = null,
  onFollowChange,
}: DiscoverCreatorInfoProps) {
  const profileHref = buildCreatorProfileHref({
    username: creator.username,
    articleId,
  });
  const peerUserId = creator.id;
  const isSelf = Boolean(peerUserId && viewerId && viewerId === peerUserId);
  const canMessage = isUuid(peerUserId) && !isSelf;
  const returnPath =
    postId != null && String(postId).length > 0
      ? `${APP_ROUTES.home}?post=${postId}`
      : APP_ROUTES.home;

  return (
    <div className="flex items-center gap-3">
      <Link
        href={profileHref}
        className="watch-focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-blue-400/40 to-indigo-600/50 text-base font-black text-white shadow-[0_0_24px_rgba(59,130,246,0.28)] backdrop-blur-md transition hover:opacity-90"
        aria-label={`Open ${creator.name}'s profile`}
      >
        {creator.avatar}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={profileHref}
            className="truncate text-base font-black tracking-tight transition hover:text-white/85"
          >
            {creator.username}
          </Link>
          {peerUserId ? (
            <FollowButton
              targetUserId={peerUserId}
              viewerId={viewerId}
              initialFollowing={Boolean(creator.isFollowing)}
              returnPath={returnPath}
              size="sm"
              followingClassName="border border-white/20 bg-white/10 text-white/80"
              idleClassName="border border-sky-300/35 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"
              onFollowChange={(snapshot) => {
                onFollowChange?.(peerUserId, snapshot.following);
              }}
            />
          ) : null}
          <StartDirectMessageButton
            peerUserId={peerUserId ?? ""}
            peerName={creator.name}
            hidden={!canMessage}
            className="watch-focus-ring pointer-events-auto shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/90 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
          />
        </div>
        <p className="truncate text-sm text-white/55">
          {location.city}, {location.country}
        </p>
      </div>
    </div>
  );
}
