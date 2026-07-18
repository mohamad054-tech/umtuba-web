"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfileForUser } from "../../../lib/supabase/auth";
import { tryCreateClient } from "../../../lib/supabase/client";
import { APP_ROUTES, buildCreatorProfileHref } from "../../lib/nav";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import ActivityTierBadge from "./ActivityTierBadge";
import { useActivityTier } from "./useActivityTier";

type ActivityTierIndicatorProps = {
  compact?: boolean;
  className?: string;
};

/**
 * Persistent header chip for the signed-in user's activity tier.
 * Lives beside the wallet pill; does not share wallet state.
 */
export default function ActivityTierIndicator({
  compact = false,
  className = "",
}: ActivityTierIndicatorProps) {
  const router = useRouter();
  const { status, progress, errorMessage, refresh } = useActivityTier();
  const [profileHref, setProfileHref] = useState<string | null>(null);

  const resolveProfileHref = useCallback(async () => {
    const supabase = tryCreateClient();
    if (!supabase) {
      setProfileHref(null);
      return null;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfileHref(null);
      return null;
    }
    try {
      const profile = await getProfileForUser(user);
      const href = buildCreatorProfileHref({ username: profile.username });
      setProfileHref(href);
      return href;
    } catch {
      setProfileHref(APP_ROUTES.settings);
      return APP_ROUTES.settings;
    }
  }, []);

  useEffect(() => {
    if (status !== "ready" && status !== "error") {
      return;
    }
    void resolveProfileHref();
  }, [status, resolveProfileHref]);

  const baseClass = compact
    ? "watch-focus-ring inline-flex h-8 max-w-[6.5rem] items-center rounded-full border px-2 text-[11px] font-bold transition"
    : "watch-focus-ring inline-flex h-9 max-w-[8.5rem] items-center rounded-full border px-2.5 text-xs font-bold transition sm:max-w-none sm:px-3";

  if (status === "loading") {
    return (
      <span
        className={`${baseClass} border-white/10 bg-white/5 text-white/40 ${className}`}
        aria-busy="true"
        aria-label="Loading activity tier"
      >
        <span className="h-3 w-3 animate-pulse rounded-full bg-sky-400/40" />
        <span className="ml-1.5 hidden sm:inline">…</span>
      </span>
    );
  }

  if (status === "signed_out") {
    return (
      <Link
        href={`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.rewards)}`}
        className={`${baseClass} border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70 ${className}`}
        aria-label="Sign in to view your activity tier"
      >
        <span aria-hidden>◇</span>
        <span className="ml-1 truncate sm:ml-1.5">Tier</span>
      </Link>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => void refresh()}
        className={`${baseClass} border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/15 ${className}`}
        aria-label="Activity tier unavailable. Retry."
        title={sanitizeUserFacingMessage(
          errorMessage,
          "Unable to load activity tier"
        )}
      >
        <span className="truncate">Retry</span>
      </button>
    );
  }

  const { tier, nextTier, progressPercent } = progress;

  return (
    <button
      type="button"
      onClick={() => {
        void (async () => {
          const href = profileHref ?? (await resolveProfileHref());
          if (href) {
            router.push(href);
          }
        })();
      }}
      className={`${baseClass} border-sky-400/25 bg-sky-500/10 text-sky-50 hover:border-sky-400/40 hover:bg-sky-500/20 ${className}`}
      aria-label={`${tier.displayTitle} tier${
        nextTier ? `, ${progressPercent}% to ${nextTier.displayTitle}` : ""
      }. Open profile.`}
      title={
        nextTier
          ? `${tier.displayTitle} · ${progressPercent}% to ${nextTier.displayTitle}`
          : `${tier.displayTitle} · max tier`
      }
    >
      <ActivityTierBadge
        tier={tier}
        size={compact ? "sm" : "md"}
        showLabel={!compact}
        className={
          compact
            ? "max-w-[5.5rem] cursor-pointer hover:brightness-110"
            : "cursor-pointer hover:brightness-110 sm:max-w-none"
        }
      />
      {compact ? (
        <span className="sr-only">{tier.displayLabel}</span>
      ) : null}
    </button>
  );
}
