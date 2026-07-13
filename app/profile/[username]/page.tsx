import { Suspense } from "react";
import { getServerUser } from "../../../lib/supabase/server";
import { getProfileByUsernameFromDb } from "../../../lib/supabase/profiles";
import { normalizeUsername } from "../../../lib/supabase/validation";
import ProfileExperience, { ProfileNotFound } from "../ProfileExperience";
import { getProfileByUsername } from "../data/mockProfiles";
import { mockProfileToView, profileRowToView } from "../lib/mapProfile";
import type { ProfileView } from "../types";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

function ProfileFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>
      <p className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        Opening profile...
      </p>
    </main>
  );
}

async function resolveProfile(username: string): Promise<{
  profile: ProfileView | null;
  isOwner: boolean;
}> {
  const key = normalizeUsername(username);
  let viewerId: string | null = null;

  try {
    const user = await getServerUser();
    viewerId = user?.id ?? null;
  } catch {
    viewerId = null;
  }

  try {
    const row = await getProfileByUsernameFromDb(key);

    if (row) {
      return {
        profile: profileRowToView(row),
        isOwner: Boolean(viewerId && viewerId === row.id),
      };
    }
  } catch (error) {
    console.error("Supabase profile lookup failed:", error);
  }

  // Development-only mock fallback — never mixed into production records.
  if (process.env.NODE_ENV === "development") {
    const mock = getProfileByUsername(key);

    if (mock) {
      return {
        profile: mockProfileToView(mock),
        isOwner: false,
      };
    }
  }

  return { profile: null, isOwner: false };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(
    decodeURIComponent(rawUsername || "")
  );
  const { profile, isOwner } = await resolveProfile(username);

  return (
    <Suspense fallback={<ProfileFallback />}>
      {profile ? (
        <ProfileExperience profile={profile} isOwner={isOwner} />
      ) : (
        <ProfileNotFound username={username || "unknown"} />
      )}
    </Suspense>
  );
}
