import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260949_toggle_post_save_side_effects_must_not_block_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("toggle_post_save side-effects must not block the bookmark", () => {
  it("is numbered 20260949, print-only, and DEFINER-wraps notification/points", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/never supabase db push/i);
    expect(sql).toMatch(/create or replace function public\.toggle_post_save/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/exception\s+when others then/);
    expect(sql).toMatch(/perform public\.create_notification/);
    expect(sql).toMatch(/perform public\.award_um_points_to_user/);
    expect(sql).toMatch(/perform public\.try_award_activity_score/);
    expect(sql).toMatch(/grant execute on function public\.toggle_post_save\(bigint\) to authenticated/);
    const fn = sql.slice(sql.indexOf("as $$"));
    expect(fn).not.toMatch(/declare[\s\S]*um_points_config_value[\s\S]*begin/i);
    expect(fn.indexOf("insert into public.post_saves")).toBeLessThan(
      fn.indexOf("um_points_config_value")
    );
  });

  it("keeps rails on the server action and shows a visible save failure", () => {
    const discover = read("app/discover/components/DiscoverActionRail.tsx");
    const watch = read("app/components/video/VideoActionRail.tsx");
    const life = read("app/life/LifeEngagementBar.tsx");

    expect(discover).toMatch(/toggleSaveAction\(postId\)/);
    expect(watch).toMatch(/toggleSaveAction\(postId\)/);
    expect(life).toMatch(/toggleSaveAction\(post\.id\)/);
    expect(discover).not.toMatch(/-left-40/);
    expect(watch).not.toMatch(/-left-40/);
    expect(discover).toMatch(/bottom-full/);
    expect(watch).toMatch(/bottom-full/);
    expect(discover).toMatch(/Unable to save this video/);
    expect(life).toMatch(/role="status"/);
  });
});
