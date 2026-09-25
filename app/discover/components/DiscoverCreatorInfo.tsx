"use client";

import Link from "next/link";
import FollowButton from "../../components/social/FollowButton";
import { APP_ROUTES, buildCreatorProfileHref } from "../../lib/nav";
import type { DiscoverCreator } from "../types";

type DiscoverCreatorInfoProps = {
  creator: DiscoverCreator;
  /** Session viewer id from the Discover page (null if signed out). */
  viewerId?: string | null;
  /** Post id for auth return deep-link (`/?post=`). */
  postId?: string | number | null;
  /** Linked published article — opens profile with article prompt. */
  articleId?: string | null;
  onFollowChange?: (creatorId: string, following: boolean) => void;
};

function returnPathFor(postId: string | number | null) {
  return postId != null && String(postId).length > 0
    ? `${APP_ROUTES.home}?post=${postId}`
    : APP_ROUTES.home;
}

/** Username, with the display name on the same line when it differs. */
export default function DiscoverCreatorInfo({
  creator,
  articleId = null,
}: DiscoverCreatorInfoProps) {
  const profileHref = buildCreatorProfileHref({
    username: creator.username,
    articleId,
  });
  const username = creator.username.replace(/^@+/, "");
  const displayName = creator.name?.trim() ?? "";
  const showDisplayName =
    displayName.length > 0 &&
    displayName.replace(/^@+/, "").toLowerCase() !== username.toLowerCase();

  return (
    <Link
      href={profileHref}
      className="pointer-events-auto block min-w-0 truncate text-start text-sm font-black tracking-tight text-white"
    >
      <span>@{username}</span>
      {showDisplayName ? (
        <span className="font-semibold text-white/80"> · {displayName}</span>
      ) : null}
    </Link>
  );
}

/** Rail avatar. The gold plus reuses FollowButton and hides for self or already-following. */
export function DiscoverCreatorAvatar({
  creator,
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
  const returnPath = returnPathFor(postId);

  return (
    <div className="relative">
      <Link
        href={profileHref}
        className="watch-focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-[#f0a93b]/70 bg-black/50 text-base font-black text-white"
        aria-label={creator.name || creator.username}
      >
        {creator.avatar}
      </Link>
      {peerUserId ? (
        <span className="absolute -bottom-1 start-1/2 -translate-x-1/2">
          <FollowButton
            targetUserId={peerUserId}
            viewerId={viewerId}
            initialFollowing={Boolean(creator.isFollowing)}
            returnPath={returnPath}
            variant="plus"
            idleClassName="border border-[#f0a93b] bg-[#f0a93b] text-[#0c1842]"
            className="shadow"
            onFollowChange={(snapshot) => {
              onFollowChange?.(peerUserId, snapshot.following);
            }}
          />
        </span>
      ) : null}
    </div>
  );
}
