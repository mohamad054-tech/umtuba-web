import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractHashtagsFromCaption,
  OWN_CAPTION_UPDATE_ERRORS,
  UPDATE_OWN_POST_CAPTION_RPC,
} from "./updateOwnPostCaption";
import { MAX_CAPTION_LENGTH, validateCaption } from "./videoPostsShared";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("updateOwnPostCaption", () => {
  it("validates caption length with the shared helper", () => {
    expect(validateCaption("ok").ok).toBe(true);
    expect(validateCaption("x".repeat(MAX_CAPTION_LENGTH + 1)).ok).toBe(false);
    expect(OWN_CAPTION_UPDATE_ERRORS.authRequired).toMatch(/Sign in/);
  });

  it("extracts unique hashtags from caption text", () => {
    expect(extractHashtagsFromCaption("hello #One #one #Two")).toEqual([
      "#One",
      "#one",
      "#Two",
    ]);
  });

  it("keeps a caption-only owner RPC and a session action without service_role", () => {
    const sql = read(
      "supabase/migrations/20260945_update_own_post_caption_v1.sql"
    );
    expect(sql).toMatch(new RegExp(UPDATE_OWN_POST_CAPTION_RPC));
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/user_id = v_user/);
    expect(sql).toMatch(/set content = v_content/);
    expect(sql).not.toMatch(/service_role/);

    const action = read("app/actions/updatePostCaption.ts");
    expect(action).toMatch(/export async function updatePostCaptionAction/);
    expect(action).toMatch(/getServerUser/);
    expect(action).toMatch(/updateOwnPostCaption/);
    expect(action).not.toMatch(/service_role/);
  });
});
