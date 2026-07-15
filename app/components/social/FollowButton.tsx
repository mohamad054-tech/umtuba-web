"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleProfileFollowAction } from "../../actions/follows";
import { APP_ROUTES, isUuid } from "../../lib/nav";
import type { FollowSnapshot } from "../../../lib/supabase/follows";

type FollowButtonProps = {
  targetUserId: string;
  /** Session viewer id; null when signed out. */
  viewerId?: string | null;
  initialFollowing?: boolean;
  /** Safe path to return to after login. */
  returnPath?: string;
  className?: string;
  followingClassName?: string;
  idleClassName?: string;
  onFollowChange?: (snapshot: FollowSnapshot) => void;
  size?: "sm" | "md";
};

/**
 * Shared Follow/Unfollow control — database owns relationship state via
 * toggleProfileFollowAction. Optimistic UI rolls back on error.
 */
export default function FollowButton({
  targetUserId,
  viewerId = null,
  initialFollowing = false,
  returnPath,
  className = "",
  followingClassName,
  idleClassName,
  onFollowChange,
  size = "md",
}: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [syncedKey, setSyncedKey] = useState(
    () => `${targetUserId}:${Boolean(initialFollowing)}`
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const propKey = `${targetUserId}:${Boolean(initialFollowing)}`;
  if (propKey !== syncedKey) {
    setSyncedKey(propKey);
    setFollowing(Boolean(initialFollowing));
    setErrorMessage(null);
  }

  const isSelf = Boolean(
    viewerId && targetUserId && viewerId === targetUserId
  );
  const canFollow = isUuid(targetUserId) && !isSelf;

  if (!canFollow) {
    return null;
  }

  const nextPath = returnPath || pathname || APP_ROUTES.discover;
  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(nextPath)}`;

  const sizeClass =
    size === "sm"
      ? "px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]"
      : "px-5 py-2.5 text-sm font-black";

  const followingStyles =
    followingClassName ||
    "border border-white/15 bg-white/10 text-white hover:bg-white/15";
  const idleStyles =
    idleClassName || "bg-white text-black hover:bg-white/90";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        aria-pressed={following}
        aria-busy={pending}
        onClick={() => {
          if (!viewerId) {
            router.push(loginHref);
            return;
          }

          const previous = following;
          setFollowing(!previous);
          setErrorMessage(null);

          startTransition(() => {
            void toggleProfileFollowAction(targetUserId).then((result) => {
              if (!result.ok) {
                setFollowing(previous);
                setErrorMessage(result.message);
                if (result.requiresAuth) {
                  router.push(loginHref);
                }
                return;
              }
              setFollowing(result.following);
              onFollowChange?.({
                following: result.following,
                followersCount: result.followersCount,
                followingCount: result.followingCount,
              });
            });
          });
        }}
        className={`watch-focus-ring shrink-0 rounded-full transition disabled:cursor-wait disabled:opacity-60 ${sizeClass} ${
          following ? followingStyles : idleStyles
        } ${className}`}
      >
        {pending ? "…" : following ? "Following" : "Follow"}
      </button>
      {errorMessage ? (
        <p className="max-w-[14rem] text-[11px] font-medium text-red-200/90">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
