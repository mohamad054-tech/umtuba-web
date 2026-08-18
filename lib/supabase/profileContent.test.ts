import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatMediaDurationLabel,
  formatProfileStatLabel,
  mapContentLiveToProfileSessions,
  mapContentVideosToProfileVideos,
  PROFILE_VIDEO_PAGE_SIZE,
} from "./profileContent";
import { profileRowToView } from "../../app/profile/lib/mapProfile";
import type { ProfileRow } from "./database.types";

const ROOT = join(process.cwd());

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

const BASE_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "creator_one",
  display_name: "Creator One",
  full_name: "Creator One",
  bio: "Hello",
  city: "Nairobi",
  country: "Kenya",
  avatar_url: null,
  avatar_initial: "C",
  created_at: "2026-01-15T12:00:00.000Z",
  updated_at: "2026-01-15T12:00:00.000Z",
} as ProfileRow;

describe("profile content mapping", () => {
  it("maps only the selected user’s videos and links to Watch", () => {
    const videos = mapContentVideosToProfileVideos([
      {
        postId: 42,
        title: "Sunset",
        views: 1200,
        likes: 15,
        previewUrl: "https://example.com/v.mp4",
        thumbnailUrl: "https://example.com/thumb.jpg",
        href: "/watch?post=42",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);

    expect(videos).toHaveLength(1);
    expect(videos[0]?.postId).toBe(42);
    expect(videos[0]?.href).toBe("/watch?post=42");
    expect(videos[0]?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(videos[0]?.durationLabel).toBeNull();
    expect(videos[0]?.viewsLabel).toBe("1.2K");
  });

  it("maps active live rooms only (no fabricated history)", () => {
    const sessions = mapContentLiveToProfileSessions([
      {
        roomId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "City walk",
        viewerCount: 12,
        city: "Lagos",
        country: "Nigeria",
        status: "live",
      },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.isLiveNow).toBe(true);
    expect(sessions[0]?.streamId).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    );
  });

  it("fills real stats and empty content honestly on profileRowToView", () => {
    const view = profileRowToView(BASE_ROW, {
      follow: {
        following: true,
        followersCount: 10,
        followingCount: 3,
      },
      stats: { videoCount: 2, likesTotal: 40, viewsTotal: 900 },
      videos: [],
      liveRooms: [],
    });

    expect(view.followersLabel).toBe("10");
    expect(view.followingLabel).toBe("3");
    expect(view.likesLabel).toBe("40");
    expect(view.viewsLabel).toBe("900");
    expect(view.videoTotalCount).toBe(2);
    expect(view.videos).toEqual([]);
    expect(view.liveSessions).toEqual([]);
    expect(view.isLive).toBe(false);
    expect(view.likesLabel).not.toBe("—");
    expect(view.about.joinedLabel).toMatch(/Joined/);
  });

  it("marks live when an active room exists for the host", () => {
    const view = profileRowToView(BASE_ROW, {
      liveRooms: [
        {
          roomId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          title: "Now live",
          viewerCount: 5,
          city: "Accra",
          country: "Ghana",
          status: "live",
        },
      ],
      stats: { videoCount: 0, likesTotal: 0, viewsTotal: 0 },
      videos: [],
    });
    expect(view.isLive).toBe(true);
    expect(view.liveStreamId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(view.liveSessions).toHaveLength(1);
  });

  it("formats zero stats as 0, never inventing marketing placeholders", () => {
    expect(formatProfileStatLabel(0)).toBe("0");
    expect(PROFILE_VIDEO_PAGE_SIZE).toBeLessThanOrEqual(48);
  });

  it("formats authoritative media duration only", () => {
    expect(formatMediaDurationLabel(null)).toBeNull();
    expect(formatMediaDurationLabel(0)).toBeNull();
    expect(formatMediaDurationLabel(72000)).toBe("1:12");
    expect(formatMediaDurationLabel(3_600_000)).toBe("1:00:00");
  });
});

describe("profile content architecture", () => {
  it("loads owned posts + active live + stats on the profile page", () => {
    const page = readRepoFile("app/profile/[username]/page.tsx");
    expect(page).toMatch(/listProfileVideos/);
    expect(page).toMatch(/listProfileActiveLiveRooms/);
    expect(page).toMatch(/getProfileContentStats/);
    expect(page).toMatch(/getProfileFollowSnapshot/);
    expect(page).toMatch(/mergeOwnedVideosIntoProfileCards/);
    expect(page).toMatch(/video\.thumbnailUrl/);
    expect(page).toMatch(/missingProfile/);
  });

  it("keeps FollowButton on visitor actions and Edit for owner", () => {
    const actions = readRepoFile("app/profile/components/ProfileActions.tsx");
    expect(actions).toMatch(/FollowButton/);
    expect(actions).toMatch(/!isOwner/);
    expect(actions).toMatch(/Edit profile/);
  });

  it("scopes video query to user_id and live query to host_id + live/public", () => {
    const lib = readRepoFile("lib/supabase/profileContent.ts");
    expect(lib).toMatch(/\.eq\("user_id", userId\)/);
    expect(lib).toMatch(/\.eq\("media_status", "ready"\)/);
    expect(lib).toMatch(/\.eq\("host_id", hostId\)/);
    expect(lib).toMatch(/\.eq\("status", "live"\)/);
    expect(lib).toMatch(/\.eq\("visibility", "public"\)/);
    expect(lib).toMatch(/attachPlaybackUrls/);
    expect(lib).not.toMatch(/um_point_balances|get_my_um_points/);
  });

  it("ships stats RPC migration without fabricating ended live history", () => {
    const sql = readRepoFile(
      "supabase/migrations/20260725_profile_content_stats.sql"
    );
    expect(sql).toMatch(/get_profile_content_stats/);
    expect(sql).toMatch(/sum\(likes\)/);
    expect(sql).toMatch(/sum\(views\)/);

    const livePanel = readRepoFile(
      "app/profile/components/ProfileLivePanel.tsx"
    );
    const content = readRepoFile("lib/supabase/profileContent.ts");
    expect(livePanel).toMatch(/Live Now/);
    expect(livePanel).toMatch(/Upcoming/);
    expect(livePanel).toMatch(/Past/);
    expect(content).toMatch(/\.eq\("status", "live"\)/);
    expect(content).not.toMatch(/status", "ended"/);
  });

  it("video grid links to Watch and shows honest empty copy", () => {
    const grid = readRepoFile("app/profile/components/ProfileVideoGrid.tsx");
    expect(grid).toMatch(/No published videos yet/);
    expect(grid).toMatch(/video\.href/);
    expect(grid).toMatch(/<video/);
  });
});
