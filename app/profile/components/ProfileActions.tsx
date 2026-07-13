import Link from "next/link";
import {
  APP_ROUTES,
  buildLiveStreamHref,
  buildMessageCreatorHref,
} from "../../lib/nav";
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
  const messageHref = buildMessageCreatorHref({
    id: profile.id,
    name: profile.displayName,
  });
  const liveHref = profile.liveStreamId
    ? buildLiveStreamHref(profile.liveStreamId)
    : null;

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
    <div className="flex flex-wrap gap-2">
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

      <Link
        href={messageHref}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        Message
      </Link>

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
