"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleProfileFollowAction } from "../../actions/notifications";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import { buildCreatorProfileHref, isUuid } from "../../lib/nav";
import type { DiscoverCreator, DiscoverLocation } from "../types";

type DiscoverCreatorInfoProps = {
  creator: DiscoverCreator;
  location: DiscoverLocation;
  /** Session viewer id from the Discover page (null if signed out). */
  viewerId?: string | null;
};

export default function DiscoverCreatorInfo({
  creator,
  location,
  viewerId = null,
}: DiscoverCreatorInfoProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(Boolean(creator.isFollowing));
  const [followError, setFollowError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const profileHref = buildCreatorProfileHref({
    username: creator.username,
  });
  const peerUserId = creator.id;
  const isSelf = Boolean(peerUserId && viewerId && viewerId === peerUserId);
  const canMessage = isUuid(peerUserId) && !isSelf;
  const canFollow = isUuid(peerUserId) && !isSelf;

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
          {canFollow ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!viewerId) {
                  router.push(`/login?next=${encodeURIComponent("/discover")}`);
                  return;
                }
                const previous = following;
                setFollowing(!previous);
                setFollowError(null);
                startTransition(() => {
                  void toggleProfileFollowAction(peerUserId!).then((result) => {
                    if (!result.ok) {
                      setFollowing(previous);
                      setFollowError(result.message);
                      if (result.requiresAuth) {
                        router.push(
                          `/login?next=${encodeURIComponent("/discover")}`
                        );
                      }
                      return;
                    }
                    setFollowing(result.following);
                  });
                });
              }}
              aria-pressed={following}
              className={`watch-focus-ring pointer-events-auto shrink-0 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] transition disabled:opacity-60 ${
                following
                  ? "border-white/20 bg-white/10 text-white/80"
                  : "border-sky-300/35 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
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
        {followError ? (
          <p className="mt-1 text-[11px] font-medium text-red-200/90">
            {followError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
