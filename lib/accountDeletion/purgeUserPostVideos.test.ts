import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertOwnedAccountMediaPaths,
  purgeUserPostVideos,
} from "./purgeUserPostVideos";

const ROOT = process.cwd();
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("account deletion media purge", () => {
  it("refuses paths outside the deleted user's folder", () => {
    const result = assertOwnedAccountMediaPaths(OWNER, [
      `${OWNER}/a.mp4`,
      `${OTHER}/secret.mp4`,
      "../etc/passwd",
    ]);
    expect(result.allowed).toEqual([`${OWNER}/a.mp4`]);
    expect(result.refused).toEqual([`${OTHER}/secret.mp4`, "../etc/passwd"]);
  });

  it("ACCOUNT_DELETE_CLEANUP dry-run does not delete", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(async () => ({
              data: [
                {
                  video_path: `${OWNER}/clip-playback.mp4`,
                  thumbnail_path: `${OWNER}/thumbs/x.jpg`,
                  media_pipeline: {
                    ugc_transcode: {
                      original_path: `${OWNER}/clip.mp4`,
                      optimized_path: `${OWNER}/clip-playback.mp4`,
                    },
                  },
                },
              ],
              error: null,
            })),
          }),
        }),
      })),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(async () => ({ data: [], error: null })),
          remove,
        })),
      },
    };

    const result = await purgeUserPostVideos(supabase as never, OWNER, "dry-run");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidatePaths).toEqual(
        expect.arrayContaining([
          `${OWNER}/clip-playback.mp4`,
          `${OWNER}/clip.mp4`,
        ])
      );
      expect(result.deletedPaths).toEqual([]);
    }
    expect(remove).not.toHaveBeenCalled();
  });

  it("ACCOUNT_DELETE_CLEANUP apply deletes only that user's objects", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn(async () => ({
              data: [{ video_path: `${OWNER}/only.mp4`, thumbnail_path: null, media_pipeline: null }],
              error: null,
            })),
          }),
        }),
      })),
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(async () => ({
            data: [{ name: "only.mp4", id: "obj-1", metadata: { size: 12 } }],
            error: null,
          })),
          remove,
        })),
      },
    };

    const result = await purgeUserPostVideos(supabase as never, OWNER, "apply");
    expect(result.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith([`${OWNER}/only.mp4`]);
    expect(remove.mock.calls.flat(2).join(" ")).not.toContain(OTHER);
  });

  it("hooks the purge script to pending account_deletion_requests", () => {
    const script = readFileSync(
      join(ROOT, "scripts/media/accountDeletionMediaPurge.ts"),
      "utf8"
    );
    expect(script).toMatch(/account_deletion_requests/);
    expect(script).toMatch(/purgeUserPostVideos/);
    expect(script).toMatch(/pending/);
    expect(script).toMatch(/--dry-run|--apply/);
  });
});
