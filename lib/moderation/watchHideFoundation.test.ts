import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260950_post_watch_completions_hide_feed_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("hide watched videos foundation", () => {
  it("adds a separate completions table and does not touch record_post_view", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/never supabase db push/i);
    expect(sql).toMatch(/create table if not exists public\.post_watch_completions/);
    expect(sql).toMatch(/post_watch_completions_user_watched_at_idx/);
    expect(sql).toMatch(/create or replace function public\.record_post_watch_completion/);
    expect(sql).not.toMatch(/create or replace function public\.record_post_view/);
    expect(sql).not.toMatch(/update public\.posts set views/);
  });

  it("wires Home and Watch through the hide policy without changing view counting", () => {
    const policy = read("app/lib/video/feedPolicy.ts");
    const server = read("lib/supabase/videoPostsServer.ts");
    const helper = read("app/lib/video/recordFeedView.ts");
    const remember = read("lib/video/rememberQualifiedWatch.ts");
    expect(policy).toMatch(/WATCH_HIDE_WINDOW_DAYS|14-day hide/i);
    expect(server).toMatch(/guestWatched/);
    expect(server).toMatch(/loadRecentWatchCompletions/);
    expect(helper).toMatch(/recordViewAction/);
    expect(remember).not.toMatch(/recordViewAction/);
    expect(remember).toMatch(/recordQualifiedWatchAction/);
  });
});
