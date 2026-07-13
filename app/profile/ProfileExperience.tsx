"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_ROUTES } from "../lib/nav";
import {
  ProfileAbout,
  ProfileActions,
  ProfileHeader,
  ProfileLivePanel,
  ProfileShell,
  ProfileStats,
  ProfileTabs,
  ProfileVideoGrid,
  type ProfileTabId,
} from "./components";
import type { ProfileView } from "./types";

type ProfileExperienceProps = {
  profile: ProfileView;
  isOwner: boolean;
};

export default function ProfileExperience({
  profile,
  isOwner,
}: ProfileExperienceProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>("videos");
  const [isFollowing, setIsFollowing] = useState(
    Boolean(profile.isFollowing)
  );

  return (
    <ProfileShell>
      <div className="space-y-5 md:space-y-6">
        {profile.source === "mock" ? (
          <p
            role="status"
            className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Development mock profile — not a production Supabase record.
          </p>
        ) : null}

        <section className="space-y-5 rounded-[28px] border border-white/10 bg-[#080816]/70 p-5 backdrop-blur-xl md:rounded-[32px] md:p-7">
          <ProfileHeader profile={profile} />
          <ProfileStats
            followersLabel={profile.followersLabel}
            followingLabel={profile.followingLabel}
            likesLabel={profile.likesLabel}
          />
          <ProfileActions
            profile={profile}
            isOwner={isOwner}
            isFollowing={isFollowing}
            onToggleFollow={() => setIsFollowing((value) => !value)}
          />
        </section>

        <ProfileTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          videoCount={profile.videos.length}
          liveCount={profile.liveSessions.length}
        />

        <section
          role="tabpanel"
          aria-label={
            activeTab === "videos"
              ? "Videos"
              : activeTab === "live"
                ? "Live"
                : "About"
          }
        >
          {activeTab === "videos" ? (
            <ProfileVideoGrid videos={profile.videos} />
          ) : null}
          {activeTab === "live" ? (
            <ProfileLivePanel
              sessions={profile.liveSessions}
              isLive={profile.isLive}
            />
          ) : null}
          {activeTab === "about" ? <ProfileAbout profile={profile} /> : null}
        </section>
      </div>
    </ProfileShell>
  );
}

export function ProfileNotFound({ username }: { username: string }) {
  return (
    <ProfileShell>
      <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#080816]/70 px-6 py-16 text-center backdrop-blur-xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300/80">
          Profile
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">
          @{username} not found
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/55">
          This profile is not in UMTUBA yet. Try Discover or Live, or create an
          account to claim your username.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href={APP_ROUTES.discover}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
          >
            Open Discover
          </Link>
          <Link
            href={APP_ROUTES.live}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10"
          >
            Open Live
          </Link>
        </div>
      </div>
    </ProfileShell>
  );
}
