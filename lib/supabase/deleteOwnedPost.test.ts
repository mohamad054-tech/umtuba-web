import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applySuccessfulDeleteToList,
  parseOwnedPostImageObjectPath,
  viewerMaySeeDeleteControl,
} from "./deleteOwnedPostShared";
import { deletePostForOwner, wouldDeleteStoragePath } from "./deleteOwnedPost";

const ROOT = process.cwd();
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

vi.mock("../content/services/lifecycleService", () => ({
  deactivateContentLifecycle: vi.fn(async () => ({
    ok: true,
    data: { found: true },
  })),
}));

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function ownedVideoPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    user_id: OWNER,
    post_type: "video",
    video_path: `${OWNER}/clip.mp4`,
    thumbnail_path: `${OWNER}/thumbs/clip.jpg`,
    image_url: null,
    ...overrides,
  };
}

function createSupabaseMock(options: {
  load: { data: unknown; error: unknown };
  deleted?: { data: unknown; error: unknown };
}) {
  const remove = vi.fn(async () => ({ error: null }));
  let postsCalls = 0;
  const from = vi.fn(() => {
    postsCalls += 1;
    if (postsCalls === 1) {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn(async () => options.load),
          }),
        }),
      };
    }
    return {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn(async () => options.deleted ?? { data: [{ id: 42 }], error: null }),
          }),
        }),
      }),
    };
  });

  return {
    from,
    storage: {
      from: vi.fn(() => ({ remove })),
    },
    remove,
    postsCalls: () => postsCalls,
  };
}

describe("own content delete — authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("OWNER_DELETE: owner can delete own video", async () => {
    const supabase = createSupabaseMock({
      load: { data: ownedVideoPost(), error: null },
    });

    const result = await deletePostForOwner(
      supabase as never,
      OWNER,
      42
    );

    expect(result).toEqual({ ok: true, postId: 42, postType: "video" });
    expect(supabase.postsCalls()).toBe(2);
    expect(supabase.remove).toHaveBeenCalled();
  });

  it("OWNER_DELETE: owner can delete own image post", async () => {
    const imageUrl = `https://example.supabase.co/storage/v1/object/public/post-images/${OWNER}/pic.jpg`;
    const supabase = createSupabaseMock({
      load: {
        data: ownedVideoPost({
          post_type: "image",
          video_path: null,
          thumbnail_path: null,
          image_url: imageUrl,
        }),
        error: null,
      },
    });

    const result = await deletePostForOwner(supabase as never, OWNER, 42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.postType).toBe("image");
    }
  });

  it("NON_OWNER_DELETE_BLOCKED: non-owner cannot delete (backend, not missing UI)", async () => {
    const supabase = createSupabaseMock({
      load: { data: ownedVideoPost(), error: null },
    });

    const result = await deletePostForOwner(supabase as never, OTHER, 42);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_owner");
    }
    expect(supabase.postsCalls()).toBe(1);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it("does not delete storage when the row delete fails", async () => {
    const supabase = createSupabaseMock({
      load: { data: ownedVideoPost(), error: null },
      deleted: { data: null, error: { message: "RLS denied" } },
    });

    const result = await deletePostForOwner(supabase as never, OWNER, 42);
    expect(result.ok).toBe(false);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it("refuses storage paths outside the owner folder", () => {
    expect(wouldDeleteStoragePath(OWNER, `${OWNER}/clip.mp4`)).toBe(true);
    expect(wouldDeleteStoragePath(OWNER, `${OTHER}/clip.mp4`)).toBe(false);
    expect(wouldDeleteStoragePath(OWNER, "../secret")).toBe(false);
    expect(wouldDeleteStoragePath(OWNER, `${OWNER}/../${OTHER}/x`)).toBe(false);
  });
});

describe("own content delete — shared helpers", () => {
  it("shows Delete only when viewer is the owner UUID", () => {
    expect(viewerMaySeeDeleteControl(OWNER, OWNER)).toBe(true);
    expect(viewerMaySeeDeleteControl(OTHER, OWNER)).toBe(false);
    expect(viewerMaySeeDeleteControl(null, OWNER)).toBe(false);
    expect(viewerMaySeeDeleteControl(OWNER, null)).toBe(false);
    expect(viewerMaySeeDeleteControl("not-a-uuid", "not-a-uuid")).toBe(false);
  });

  it("parses only owned post-images public URLs", () => {
    const owned = `https://proj.supabase.co/storage/v1/object/public/post-images/${OWNER}/a.jpg`;
    const other = `https://proj.supabase.co/storage/v1/object/public/post-images/${OTHER}/a.jpg`;
    expect(parseOwnedPostImageObjectPath(OWNER, owned)).toBe(`${OWNER}/a.jpg`);
    expect(parseOwnedPostImageObjectPath(OWNER, other)).toBeNull();
    expect(parseOwnedPostImageObjectPath(OWNER, "https://cdn.example/pic.jpg")).toBeNull();
  });

  it("failed deletion does not remove the item from local lists", () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(
      applySuccessfulDeleteToList(items, (item) => item.id === 1, false)
    ).toEqual(items);
    expect(
      applySuccessfulDeleteToList(items, (item) => item.id === 1, true)
    ).toEqual([{ id: 2 }]);
  });
});

describe("own content delete — contracts", () => {
  it("keeps posts RLS owner-delete and does not use service_role in the action", () => {
    const rls = read("supabase/migrations/20260712_auth_profiles_posts_rls.sql");
    expect(rls).toMatch(/Users can delete their own posts/);
    expect(rls).toMatch(/for delete/);
    expect(rls).toMatch(/\(select auth\.uid\(\)\) = user_id/);

    const action = read("app/actions/deletePost.ts");
    expect(action).toMatch(/export async function deletePostAction/);
    expect(action).toMatch(/getServerUser/);
    expect(action).not.toMatch(/service_role/);
    expect(action).toMatch(/deletePostForOwner/);

    const lib = read("lib/supabase/deleteOwnedPost.ts");
    expect(lib).toMatch(/existing\.user_id !== userId|post\.user_id !== userId/);
    expect(lib).toMatch(/\.eq\("user_id", userId\)/);
    expect(lib).toMatch(/deleteOwnedVideoObject|isOwnedVideoPath/);
  });

  it("wires owner Delete into video and post surfaces with confirmation", () => {
    const control = read("app/components/social/OwnerContentDeleteControl.tsx");
    expect(control).toMatch(/deletePostAction/);
    expect(control).toMatch(/This cannot be undone/);
    expect(control).toMatch(/Deleting…/);
    expect(control).toMatch(/if \(pending\)/);
    expect(control).toMatch(/role="dialog"/);
    expect(control).toMatch(/min-h-\[44px\]/);

    const discover = read("app/discover/components/DiscoverActionRail.tsx");
    expect(discover).toMatch(/OwnerContentDeleteControl/);
    expect(discover).toMatch(/kind="video"/);

    const watch = read("app/components/video/VideoActionRail.tsx");
    expect(watch).toMatch(/OwnerContentDeleteControl/);

    const card = read("app/components/ContentCard.tsx");
    expect(card).toMatch(/OwnerContentDeleteControl/);

    const videos = read("app/profile/components/ProfileVideoGrid.tsx");
    expect(videos).toMatch(/OwnerContentDeleteControl/);

    const photos = read("app/profile/components/ProfilePhotosPanel.tsx");
    expect(photos).toMatch(/OwnerContentDeleteControl/);
  });
});
