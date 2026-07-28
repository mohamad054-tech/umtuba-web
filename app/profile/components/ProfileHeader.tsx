import ActivityTierBadge from "../../components/activity-tiers/ActivityTierBadge";
import ActivityTierProgressBar from "../../components/activity-tiers/ActivityTierProgressBar";
import ProfileLiveBadge from "./ProfileLiveBadge";
import type { ProfileView } from "../types";

type ProfileHeaderProps = {
  profile: ProfileView;
  /** When true, show next-tier progress under the badge. */
  showTierProgress?: boolean;
  /** Sticky collapse state — compress cover / avatar (Motion / A11y Pass). */
  isCollapsed?: boolean;
};

/**
 * Professional creator header (UMTUBA identity — not FB/TikTok clone).
 * Cover uses brand gradient until a stored cover_url exists (no new migration).
 */
export default function ProfileHeader({
  profile,
  showTierProgress = true,
  isCollapsed = false,
}: ProfileHeaderProps) {
  const tierProgress = profile.activityTier ?? null;

  return (
    <div className="space-y-5">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br transition-[height] duration-200 motion-reduce:transition-none ${
          isCollapsed ? "h-20 sm:h-24" : "h-36 sm:h-44"
        } ${profile.avatarGradient}`}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.25),transparent_40%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080816] to-transparent" />
      </div>

      <div
        className={`flex min-w-0 flex-col gap-5 px-1 transition-[margin] duration-200 motion-reduce:transition-none sm:flex-row sm:items-end ${
          isCollapsed ? "-mt-10 sm:-mt-12" : "-mt-14 sm:-mt-16"
        }`}
      >
        <div className="relative shrink-0 self-start">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage URLs
            <img
              src={profile.avatarUrl}
              alt={`${profile.displayName} avatar`}
              className={`rounded-full object-cover ring-4 ring-[#080816] transition-[width,height] duration-200 motion-reduce:transition-none ${
                isCollapsed
                  ? "h-16 w-16 sm:h-20 sm:w-20"
                  : "h-24 w-24 sm:h-28 sm:w-28"
              }`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-full bg-gradient-to-br font-black text-white ring-4 ring-[#080816] transition-[width,height,font-size] duration-200 motion-reduce:transition-none ${
                isCollapsed
                  ? "h-16 w-16 text-lg sm:h-[4.5rem] sm:w-[4.5rem]"
                  : "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl"
              } ${profile.avatarGradient}`}
            >
              {profile.avatarInitial}
            </div>
          )}
          {profile.isLive ? (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <ProfileLiveBadge />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3 pb-1">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {profile.displayName}
              </h2>
              {tierProgress ? (
                <ActivityTierBadge tier={tierProgress.tier} size="lg" />
              ) : null}
            </div>
            <p className="text-sm font-medium text-white/45">
              @{profile.username}
            </p>
          </div>

          {tierProgress && showTierProgress ? (
            <div className="max-w-md space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Activity tier
              </p>
              <p className="text-sm text-white/70">
                {tierProgress.tier.displayTitle}
                <span className="text-white/40">
                  {" "}
                  · {tierProgress.score.toLocaleString()} activity score
                </span>
              </p>
              <ActivityTierProgressBar progress={tierProgress} />
              <p className="text-[11px] leading-5 text-white/40">
                Ranked by authentic contributions — not wallet balance or
                passive watch time.
              </p>
            </div>
          ) : null}

          {profile.bio ? (
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              {profile.bio}
            </p>
          ) : null}

          {profile.city || profile.country ? (
            <p className="text-sm text-white/50">
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </p>
          ) : null}

          {profile.about.website ? (
            <a
              href={profile.about.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
            >
              {profile.about.website.replace(/^https?:\/\//, "")}
            </a>
          ) : null}

          {profile.about.joinedLabel ? (
            <p className="text-xs text-white/40">
              Joined {profile.about.joinedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
