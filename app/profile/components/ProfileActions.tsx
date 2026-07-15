"use client";

import Link from "next/link";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import FollowButton from "../../components/social/FollowButton";
import { APP_ROUTES, buildLiveStreamHref, isUuid } from "../../lib/nav";
import type { FollowSnapshot } from "../../../lib/supabase/follows";
import type { ProfileView } from "../types";

type ProfileActionsProps = {
  profile: ProfileView;
  isOwner: boolean;
  viewerId?: string | null;
  isFollowing: boolean;
  onFollowChange?: (snapshot: FollowSnapshot) => void;
};

export default function ProfileActions({
  profile,
  isOwner,
  viewerId = null,
  isFollowing,
  onFollowChange,
}: ProfileActionsProps) {
  const liveHref = profile.liveStreamId
    ? buildLiveStreamHref(profile.liveStreamId)
    : null;
  // Real Supabase auth UUID only — mock / missing ids stay hidden.
  const canMessage =
    !isOwner && profile.source === "supabase" && isUuid(profile.id);
  const canFollow =
    !isOwner && profile.source === "supabase" && isUuid(profile.id);

  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={APP_ROUTES.settings}
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
        >
          Edit profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {canFollow ? (
        <FollowButton
          targetUserId={profile.id}
          viewerId={viewerId}
          initialFollowing={isFollowing}
          returnPath={`${APP_ROUTES.profile}/${profile.username}`}
          onFollowChange={onFollowChange}
        />
      ) : null}

      <StartDirectMessageButton
        peerUserId={profile.id}
        peerName={profile.displayName}
        hidden={!canMessage}
      />

      {liveHref ? (
        <Link
          href={liveHref}
          className="watch-focus-ring rounded-full border border-red-400/35 bg-red-500/15 px-5 py-2.5 text-sm font-bold text-red-100 transition hover:bg-red-500/25"
        >
          Watch live
        </Link>
      ) : null}
    </div>
  );
}
