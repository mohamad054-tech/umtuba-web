import ProfileLiveBadge from "./ProfileLiveBadge";
import type { ProfileView } from "../types";

type ProfileHeaderProps = {
  profile: ProfileView;
};

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
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
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {profile.displayName}
          </h2>
          <p className="text-sm font-medium text-white/45">
            @{profile.username}
          </p>
        </div>

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
