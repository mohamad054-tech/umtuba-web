import Link from "next/link";
import {
  buildCreatorProfileHref,
  buildHomeCityFocusHref,
  buildMessageCreatorHref,
} from "../../lib/nav";
import type { LiveStream } from "../data/mockStreams";

type LiveCreatorBarProps = {
  creator: LiveStream["creator"];
  city: string;
  country: string;
  startedAtLabel: string;
  isFollowing: boolean;
  onToggleFollow: () => void;
};

export default function LiveCreatorBar({
  creator,
  city,
  country,
  startedAtLabel,
  isFollowing,
  onToggleFollow,
}: LiveCreatorBarProps) {
  const locationLabel = `${city}, ${country}`;
  const profileHref = buildCreatorProfileHref({
    username: creator.handle,
  });
  const messageHref = buildMessageCreatorHref({
    id: creator.id,
    name: creator.name,
  });
  const exploreHref = buildHomeCityFocusHref(city);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={profileHref}
            className="relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[#080816] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-red-400/50"
            aria-label={`Open ${creator.name}'s profile`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ring-2 ring-red-400/40 ${creator.avatarGradient}`}
            >
              {creator.initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0b18] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </Link>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={profileHref}
                className="truncate text-base font-black text-white transition hover:text-white/85"
              >
                {creator.name}
              </Link>
              <span className="text-xs font-medium text-white/40">
                {creator.handle}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/45">
              {locationLabel} · {creator.followersLabel} followers ·{" "}
              {startedAtLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleFollow}
          className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
            isFollowing
              ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
              : "bg-white text-black hover:bg-white/90"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={profileHref}
          className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          Open creator profile
        </Link>
        <Link
          href={messageHref}
          className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          Message creator
        </Link>
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
