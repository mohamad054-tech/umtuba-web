import ActivityTierBadge from "../../components/activity-tiers/ActivityTierBadge";
import ActivityTierProgressBar from "../../components/activity-tiers/ActivityTierProgressBar";
import ProfileLiveBadge from "./ProfileLiveBadge";
import type { ProfileView } from "../types";

type ProfileHeaderProps = {
  profile: ProfileView;
  /** When true, show next-tier progress under the badge. */
  showTierProgress?: boolean;
};

export default function ProfileHeader({
  profile,
  showTierProgress = true,
}: ProfileHeaderProps) {
  const tierProgress = profile.activityTier ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
      <div className="relative shrink-0 self-start">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage URLs
          <img
            src={profile.avatarUrl}
            alt={`${profile.displayName} avatar`}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-white/15 sm:h-28 sm:w-28"
          />
        ) : (
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-black text-white ring-2 ring-white/15 sm:h-28 sm:w-28 sm:text-3xl ${profile.avatarGradient}`}
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

      <div className="min-w-0 flex-1 space-y-3">
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
              Ranked by authentic contributions — not wallet balance or passive
              watch time.
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
      </div>
    </div>
  );
}
