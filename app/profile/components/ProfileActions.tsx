"use client";

import Link from "next/link";
import { useState } from "react";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import FollowButton from "../../components/social/FollowButton";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildLiveStreamHref,
  isUuid,
} from "../../lib/nav";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import type { FollowSnapshot } from "../../../lib/supabase/follows";
import type { ProfileView } from "../types";
import { CREATOR_SPACE_COPY } from "../lib/profileCreatorSpaceIa";
import { PROFILE_ERROR_STATES_COPY } from "../lib/profileErrorStates";

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
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  async function shareProfile() {
    const path = buildCreatorProfileHref({ username: profile.username });
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("error");
    }
  }

  const shareButton = (
    <button
      type="button"
      onClick={() => void shareProfile()}
      className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
      aria-label={CREATOR_SPACE_COPY.shareAriaLabel}
    >
      {shareStatus === "copied" ? "Copied" : "Share"}
    </button>
  );

  const shareFeedback =
    shareStatus === "error" ? (
      <p className="basis-full text-xs text-red-300" role="alert">
        {sanitizeUserFacingMessage(
          PROFILE_ERROR_STATES_COPY.shareError,
          PROFILE_ERROR_STATES_COPY.shareError
        )}
      </p>
    ) : (
      <span className="sr-only" aria-live="polite">
        {shareStatus === "copied" ? CREATOR_SPACE_COPY.shareCopiedSr : ""}
      </span>
    );

  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={APP_ROUTES.settings}
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
        >
          {CREATOR_SPACE_COPY.editOwnerCta}
        </Link>
        {shareButton}
        {shareFeedback}
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

      {shareButton}
      {shareFeedback}
    </div>
  );
}
