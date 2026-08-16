import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { insertVideoPostForUser } from "./videoPosts";
import { deletePostForOwner } from "./deleteOwnedPost";
import { VIDEO_SIGNED_URL_TTL_SECONDS } from "./videoPostsShared";

vi.mock("../content/services/lifecycleService", () => ({
  deactivateContentLifecycle: vi.fn(async () => ({
    ok: true,
    data: { found: true },
  })),
}));

const ROOT = process.cwd();
const OWNER = "11111111-1111-4111-8111-111111111111";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function profile() {
  return { full_name: "Ada", username: "ada", avatar_initial: "A" };
}

function createInsertSupabase(options: {
  signedUrl?: string | null;
  insert?: { data: unknown; error: unknown };
  ready?: { data: unknown; error: unknown };
  processingSelect?: { data: unknown; error: unknown };
}) {
  const remove = vi.fn(async () => ({ error: null }));
  const updates: unknown[] = [];
  let postsCalls = 0;
  const from = vi.fn(() => {
    postsCalls += 1;
    if (postsCalls === 1) {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn(async () =>
              options.insert ?? {
                data: {
                  id: 99,
                  user_id: OWNER,
                  video_path: `${OWNER}/src.mp4`,
                  media_status: "queued",
                },
                error: null,
              }
            ),
          }),
        }),
      };
    }
    return {
      update: vi.fn((payload: unknown) => {
        updates.push(payload);
        return {
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn(async () =>
                  options.ready ?? {
                    data: {
                      id: 99,
                      user_id: OWNER,
                      video_path: `${OWNER}/src.mp4`,
                      media_status: "ready",
                    },
                    error: null,
                  }
                ),
              }),
            }),
          }),
        };
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(async () =>
              options.processingSelect ?? {
                data: {
                  id: 99,
                  user_id: OWNER,
                  video_path: `${OWNER}/src.mp4`,
                  media_status: "processing",
                },
                error: null,
              }
            ),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn(async () => ({ error: null })),
        }),
      }),
    };
  });

  return {
    from,
    updates,
    remove,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({
          data: options.signedUrl === null ? null : { signedUrl: options.signedUrl ?? "https://signed.example/v.mp4" },
          error: options.signedUrl === null ? { message: "missing" } : null,
        })),
        remove,
      })),
    },
  };
}

describe("WEB/ANDROID/IOS upload-to-playback shared publish path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("WEB_UPLOAD_TO_PLAYBACK flag-off stays ready-on-original", async () => {
    const supabase = createInsertSupabase({});
    const row = await insertVideoPostForUser(
      supabase as never,
      OWNER,
      profile(),
      {
        caption: "hello",
        videoPath: `${OWNER}/src.mp4`,
        mimeType: "video/mp4",
        byteSize: 1024,
        transcodeEnabled: false,
      }
    );
    expect(row.id).toBe(99);
    expect(row.media_status).toBe("ready");
    expect(row.video_path).toBe(`${OWNER}/src.mp4`);
  });

  it("NEW_UPLOAD_TRANSCODING leaves the exact post processing for the worker", async () => {
    const supabase = createInsertSupabase({});
    const row = await insertVideoPostForUser(
      supabase as never,
      OWNER,
      profile(),
      {
        caption: "hello",
        videoPath: `${OWNER}/src.mp4`,
        mimeType: "video/mp4",
        byteSize: 1024,
        transcodeEnabled: true,
      }
    );
    expect(row.id).toBe(99);
    expect(row.media_status).toBe("processing");
    expect(row.video_path).toBe(`${OWNER}/src.mp4`);
    expect(
      supabase.updates.some((item) => (item as { media_status?: string }).media_status === "ready")
    ).toBe(false);
  });

  it("OPEN_AFTER_UPLOAD_EXACT_POST returns the inserted post id", async () => {
    const supabase = createInsertSupabase({
      insert: {
        data: { id: 777, user_id: OWNER, video_path: `${OWNER}/src.mp4`, media_status: "queued" },
        error: null,
      },
      processingSelect: {
        data: { id: 777, user_id: OWNER, video_path: `${OWNER}/src.mp4`, media_status: "processing" },
        error: null,
      },
    });
    const row = await insertVideoPostForUser(
      supabase as never,
      OWNER,
      profile(),
      {
        caption: "exact",
        videoPath: `${OWNER}/src.mp4`,
        mimeType: "video/mp4",
        byteSize: 2048,
        transcodeEnabled: true,
      }
    );
    expect(row.id).toBe(777);
  });

  it("SIGNED_URL uses the 15-minute helper and FAILED_POST_CREATION_CLEANUP deletes the object", async () => {
    const supabase = createInsertSupabase({ signedUrl: null });
    await expect(
      insertVideoPostForUser(supabase as never, OWNER, profile(), {
        caption: "x",
        videoPath: `${OWNER}/src.mp4`,
        mimeType: "video/mp4",
        byteSize: 1024,
        transcodeEnabled: true,
      })
    ).rejects.toThrow(/could not be verified/i);
    expect(supabase.remove).toHaveBeenCalledWith([`${OWNER}/src.mp4`]);
    expect(VIDEO_SIGNED_URL_TTL_SECONDS).toBe(900);
  });

  it("ANDROID/IOS shared source still uploads originals only", () => {
    const webUpload = read("lib/supabase/posts.ts");
    expect(webUpload).toMatch(/xhr\.send\(file\)/);
    expect(webUpload).not.toMatch(/libx264|ffmpeg|MediaRecorder/);
    const action = read("app/actions/createVideoPost.ts");
    expect(action).toMatch(/insertVideoPostForUser/);
    expect(action).toMatch(/deleteOwnedVideoObject/);
  });
});

describe("POST_DELETE_CLEANUP after path switch", () => {
  it("deletes current playback path and leftover original from media_pipeline", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    let postsCalls = 0;
    const supabase = {
      from: vi.fn(() => {
        postsCalls += 1;
        if (postsCalls === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 42,
                    user_id: OWNER,
                    post_type: "video",
                    video_path: `${OWNER}/clip-playback.mp4`,
                    thumbnail_path: `${OWNER}/thumbs/clip.jpg`,
                    image_url: null,
                    media_pipeline: {
                      ugc_transcode: {
                        original_path: `${OWNER}/clip.mp4`,
                        optimized_path: `${OWNER}/clip-playback.mp4`,
                      },
                    },
                  },
                  error: null,
                })),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn(async () => ({ data: [{ id: 42 }], error: null })),
              }),
            }),
          }),
        };
      }),
      storage: { from: vi.fn(() => ({ remove })) },
    };

    const result = await deletePostForOwner(supabase as never, OWNER, 42);
    expect(result.ok).toBe(true);
    const deleted = remove.mock.calls.flat(2);
    expect(deleted).toEqual(
      expect.arrayContaining([
        `${OWNER}/clip-playback.mp4`,
        `${OWNER}/clip.mp4`,
        `${OWNER}/thumbs/clip.jpg`,
      ])
    );
  });
});

describe("RANGE_REQUEST honesty", () => {
  it("does not claim Range support from repository evidence", () => {
    const server = read("lib/supabase/videoPosts.ts");
    expect(server).toMatch(/createSignedUrl/);
    expect(server).not.toMatch(/Accept-Ranges|bytes=/);
  });
});
