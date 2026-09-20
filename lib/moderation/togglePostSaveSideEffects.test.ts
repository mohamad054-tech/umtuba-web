import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260949_toggle_post_save_security_definer_v1.sql";
const OLD_MIGRATION =
  "supabase/migrations/20260949_toggle_post_save_side_effects_must_not_block_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("toggle_post_save SECURITY DEFINER (applied 2026-09-20)", () => {
  it("records the hand-applied DEFINER function without points RPCs", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, OLD_MIGRATION))).toBe(false);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/APPLIED TO PRODUCTION BY HAND 2026-09-20/);
    expect(sql).toMatch(/create or replace function public\.toggle_post_save/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/notification_actor_label/);
    expect(sql).toMatch(/perform public\.create_notification/);
    expect(sql).toMatch(
      /revoke all on function public\.toggle_post_save\(bigint\) from public,\s*anon/
    );
    expect(sql).toMatch(
      /grant execute on function public\.toggle_post_save\(bigint\) to authenticated/
    );
    const fn = sql.slice(sql.indexOf("as $$"));
    expect(fn).not.toMatch(/award_um_points_to_user/);
    expect(fn).not.toMatch(/try_award_activity_score/);
    expect(fn).not.toMatch(/um_points_config_value/);
    expect(fn).not.toMatch(/v_points/);
    expect(fn).not.toMatch(/v_cap/);
    expect(fn).not.toMatch(/exception\s+when others then/);
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
