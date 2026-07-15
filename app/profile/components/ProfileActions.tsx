"use client";

import Link from "next/link";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import { APP_ROUTES, buildLiveStreamHref, isUuid } from "../../lib/nav";
import type { ProfileView } from "../types";

type ProfileActionsProps = {
  profile: ProfileView;
  isOwner: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
};

export default function ProfileActions({
  profile,
  isOwner,
  isFollowing,
  onToggleFollow,
}: ProfileActionsProps) {
  const liveHref = profile.liveStreamId
    ? buildLiveStreamHref(profile.liveStreamId)
    : null;
  // Real Supabase auth UUID only — mock / missing ids stay hidden.
  const canMessage =
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
      <button
        type="button"
        onClick={onToggleFollow}
        className={`watch-focus-ring rounded-full px-5 py-2.5 text-sm font-black transition ${
          isFollowing
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>

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
