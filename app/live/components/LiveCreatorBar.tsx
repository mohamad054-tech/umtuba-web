"use client";

import Link from "next/link";
import FollowButton from "../../components/social/FollowButton";
import { APP_ROUTES, buildDiscoverCityHref, isUuid } from "../../lib/nav";
import { isExperimentalRouteAvailable } from "../../lib/product/surfaceGates";
import type { FollowSnapshot } from "../../../lib/supabase/follows";
import type { LiveRoom } from "../types";
import { citySlugFromName } from "../types";

type LiveCreatorBarProps = {
  host: LiveRoom["host"];
  city: string;
  country: string;
  startedAtLabel: string;
  roomId: string;
  viewerId?: string | null;
  isFollowing: boolean;
  onFollowChange?: (snapshot: FollowSnapshot) => void;
};

export default function LiveCreatorBar({
  host,
  city,
  country,
  startedAtLabel,
  roomId,
  viewerId = null,
  isFollowing,
  onFollowChange,
}: LiveCreatorBarProps) {
  const locationLabel = `${city}, ${country}`;
  const citySlug = citySlugFromName(city);
  const exploreHref = isExperimentalRouteAvailable()
    ? citySlug
      ? `/city/${citySlug}`
      : "/"
    : buildDiscoverCityHref(city, country);

  const hostId = host.id;
  const isSelf = Boolean(viewerId && hostId && viewerId === hostId);
  const canFollow = isUuid(hostId) && !isSelf;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ring-2 ring-red-400/40 ${host.avatarGradient}`}
            aria-hidden
          >
            {host.initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0b18] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-white">
                {host.name}
              </p>
              <span className="text-xs font-medium text-white/40">
                {host.handle}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {locationLabel} · {host.followersLabel} followers · {startedAtLabel}
            </p>
          </div>
        </div>

        {canFollow ? (
          <FollowButton
            targetUserId={hostId}
            viewerId={viewerId}
            initialFollowing={isFollowing}
            returnPath={`${APP_ROUTES.live}/${roomId}`}
            onFollowChange={onFollowChange}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={exploreHref}
          className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-2 text-[11px] font-bold text-sky-50 transition hover:bg-sky-500/25"
        >
          Explore this city
        </Link>
      </div>
    </div>
  );
}
