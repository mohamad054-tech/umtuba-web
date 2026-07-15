import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyFollowingToDiscoverVideos,
  formatFollowCountLabel,
} from "./follows";

const ROOT = join(process.cwd());

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = join(ROOT, dir);
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      listSourceFiles(rel, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) acc.push(rel);
  }
  return acc;
}

describe("profile follow integrity — architecture", () => {
  it("migration enforces self-follow rejection, unique insert, and snapshot counts", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260724_profile_follow_integrity.sql"
    );

    expect(sql).toMatch(
      /create or replace function public\.get_profile_follow_snapshot\(p_user_id uuid\)/i
    );
    expect(sql).toMatch(
      /create or replace function public\.toggle_profile_follow\(p_following_id uuid\)/i
    );
    expect(sql).toMatch(/raise exception 'Invalid follow target'/i);
    expect(sql).toMatch(/p_following_id = v_uid/i);
    expect(sql).toMatch(/on conflict \(follower_id, following_id\) do nothing/i);
    expect(sql).toMatch(/'followersCount'/);
    expect(sql).toMatch(/'followingCount'/);
    expect(sql).toMatch(/reason', 'missing_profile'/);
    expect(sql).toMatch(
      /grant execute on function public\.get_profile_follow_snapshot\(uuid\) to anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.toggle_profile_follow\(uuid\) to authenticated/i
    );
  });

  it("base schema keeps unique pair + no-self check (prevents duplicate rows)", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260715_notifications_v1.sql"
    );
    expect(sql).toMatch(/create table if not exists public\.profile_follows/i);
    expect(sql).toMatch(
      /constraint profile_follows_no_self check \(follower_id <> following_id\)/i
    );
    expect(sql).toMatch(/primary key \(follower_id, following_id\)/i);
  });

  it("exposes one shared server action path for follow toggle + snapshot", () => {
    const actions = readRepoFile("app/actions/follows.ts");
    expect(actions).toMatch(/export async function toggleProfileFollowAction/);
    expect(actions).toMatch(/export async function getProfileFollowSnapshotAction/);
    expect(actions).toMatch(/You can’t follow yourself/);
    expect(actions).toMatch(/requiresAuth:\s*true/);

    const lib = readRepoFile("lib/supabase/follows.ts");
    expect(lib).toMatch(/rpc\(\s*["']toggle_profile_follow["']/);
    expect(lib).toMatch(/rpc\(\s*["']get_profile_follow_snapshot["']/);
    expect(lib).toMatch(/loadFollowSnapshotFromTable/);
    expect(lib).toMatch(/loadViewerFollowingSet/);
  });

  it("self-follow is rejected in action and SQL", () => {
    const actions = readRepoFile("app/actions/follows.ts");
    const sql = readRepoFile(
      "supabase/migrations/20260724_profile_follow_integrity.sql"
    );
    const button = readRepoFile("app/components/social/FollowButton.tsx");

    expect(actions).toMatch(/user\.id === parsed\.id/);
    expect(actions).toMatch(/You can’t follow yourself/);
    expect(sql).toMatch(/p_following_id is null or p_following_id = v_uid/);
    expect(button).toMatch(/viewerId === targetUserId/);
    expect(button).toMatch(/if \(!canFollow\) \{\s*return null;/);
  });

  it("duplicate follow is idempotent (ON CONFLICT + PK)", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260724_profile_follow_integrity.sql"
    );
    const v1 = readRepoFile(
      "supabase/migrations/20260715_notifications_v1.sql"
    );
    expect(sql).toMatch(/on conflict \(follower_id, following_id\) do nothing/i);
    expect(v1).toMatch(/primary key \(follower_id, following_id\)/i);
  });

  it("logged-out follow redirects to login with return path (no local success)", () => {
    const button = readRepoFile("app/components/social/FollowButton.tsx");
    expect(button).toMatch(/if \(!viewerId\) \{\s*router\.push\(loginHref\);/);
    expect(button).toMatch(
      /\$\{APP_ROUTES\.login\}\?next=\$\{encodeURIComponent\(nextPath\)\}/
    );
    expect(button).toMatch(/toggleProfileFollowAction/);
    // Must not flip following before auth check for signed-out users.
    const onClickStart = button.indexOf("onClick={() => {");
    const signedOutGuard = button.indexOf("if (!viewerId)", onClickStart);
    const optimisticFlip = button.indexOf("setFollowing(!previous)", onClickStart);
    expect(signedOutGuard).toBeGreaterThan(onClickStart);
    expect(optimisticFlip).toBeGreaterThan(signedOutGuard);
  });

  it("rapid clicks are blocked while pending; optimistic UI rolls back on error", () => {
    const button = readRepoFile("app/components/social/FollowButton.tsx");
    expect(button).toMatch(/disabled=\{pending\}/);
    expect(button).toMatch(/startTransition/);
    expect(button).toMatch(/setFollowing\(previous\)/);
    expect(button).toMatch(/setErrorMessage\(result\.message\)/);
  });

  it("Discover, Watch, Profile, and Live share FollowButton + persistent state path", () => {
    const discover = readRepoFile(
      "app/discover/components/DiscoverCreatorInfo.tsx"
    );
    const watchOverlay = readRepoFile("app/components/video/VideoOverlay.tsx");
    const profile = readRepoFile("app/profile/components/ProfileActions.tsx");
    const profilePage = readRepoFile("app/profile/[username]/page.tsx");
    const liveBar = readRepoFile("app/live/components/LiveCreatorBar.tsx");
    const liveRoom = readRepoFile("app/live/LiveRoomExperience.tsx");
    const button = readRepoFile("app/components/social/FollowButton.tsx");
    const server = readRepoFile("lib/supabase/videoPostsServer.ts");

    expect(discover).toMatch(/FollowButton/);
    expect(discover).toMatch(/initialFollowing=\{Boolean\(creator\.isFollowing\)\}/);
    expect(watchOverlay).toMatch(/FollowButton/);
    expect(watchOverlay).toMatch(
      /initialFollowing=\{Boolean\(video\.author\.isFollowing\)\}/
    );
    expect(watchOverlay).toMatch(/APP_ROUTES\.watch/);
    expect(profile).toMatch(/FollowButton/);
    expect(profile).toMatch(/!isOwner/);
    expect(profile).toMatch(/profile\.source === "supabase"/);
    expect(profilePage).toMatch(/getProfileFollowSnapshot/);
    expect(profilePage).toMatch(/missingProfile/);
    expect(liveBar).toMatch(/FollowButton/);
    expect(liveRoom).not.toMatch(/onToggleFollow/);
    expect(liveRoom).toMatch(/getProfileFollowSnapshotAction/);
    expect(liveRoom).toMatch(/handleHostFollowChange/);
    expect(button).toMatch(/from ["']\.\.\/\.\.\/actions\/follows["']/);
    expect(server).toMatch(/loadViewerFollowingSet/);
    expect(server).toMatch(/applyFollowingToDiscoverVideos/);
    expect(server).toMatch(/loadCanonicalVideoFeedPage/);
  });

  it("follow/unfollow persist after refresh via server hydration (not client-only state)", () => {
    const server = readRepoFile("lib/supabase/videoPostsServer.ts");
    const profilePage = readRepoFile("app/profile/[username]/page.tsx");
    const liveRoom = readRepoFile("app/live/LiveRoomExperience.tsx");

    // Discover reloads following set from DB on each server fetch.
    expect(server).toMatch(/loadViewerFollowingSet/);
    // Profile loads snapshot before render.
    expect(profilePage).toMatch(/getProfileFollowSnapshot\(supabase, row\.id\)/);
    // Live loads snapshot for host (survives navigation/refresh of room).
    expect(liveRoom).toMatch(/getProfileFollowSnapshotAction\(hostFollowTargetId\)/);
  });

  it("missing profile is handled safely in SQL + profile page", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260724_profile_follow_integrity.sql"
    );
    const profilePage = readRepoFile("app/profile/[username]/page.tsx");
    const lib = readRepoFile("lib/supabase/follows.ts");

    expect(sql).toMatch(/missing_profile/);
    expect(sql).toMatch(/raise exception 'Profile not found'/i);
    expect(lib).toMatch(/missingProfile: row\?\.reason === "missing_profile"/);
    expect(profilePage).toMatch(/followResult\.missingProfile/);
    expect(profilePage).toMatch(/ProfileNotFound/);
  });

  it("keeps the single toggle helper in lib/supabase/follows (not notifications)", () => {
    const notificationsLib = readRepoFile("lib/supabase/notifications.ts");
    expect(notificationsLib).not.toMatch(
      /export async function toggleProfileFollow\b/
    );
    expect(notificationsLib).not.toMatch(
      /rpc\(\s*["']toggle_profile_follow["']/
    );

    const notificationsActions = readRepoFile("app/actions/notifications.ts");
    expect(notificationsActions).not.toMatch(/toggleProfileFollowAction/);
    expect(notificationsActions).not.toMatch(/from ["']\.\/follows["']/);

    const sources = listSourceFiles("app").filter(
      (path) =>
        !path.endsWith(".test.ts") &&
        !path.endsWith(".test.tsx") &&
        path !== "app/actions/follows.ts"
    );

    for (const path of sources) {
      const src = readRepoFile(path);
      expect(src, path).not.toMatch(
        /rpc\(\s*["']toggle_profile_follow["']/
      );
    }
  });
});

describe("follow helpers", () => {
  it("applyFollowingToDiscoverVideos sets authoritative flags from the set", () => {
    const videos = [
      { creator: { id: "a", isFollowing: false } },
      { creator: { id: "b", isFollowing: true } },
      { creator: { id: null as string | null, isFollowing: true } },
    ];
    const next = applyFollowingToDiscoverVideos(videos, new Set(["a"]));
    expect(next[0].creator.isFollowing).toBe(true);
    expect(next[1].creator.isFollowing).toBe(false);
    expect(next[2].creator.isFollowing).toBe(false);
  });

  it("formatFollowCountLabel formats real counts only", () => {
    expect(formatFollowCountLabel(0)).toBe("0");
    expect(formatFollowCountLabel(12)).toBe("12");
    expect(formatFollowCountLabel(1_200)).toBe("1.2K");
  });
});
