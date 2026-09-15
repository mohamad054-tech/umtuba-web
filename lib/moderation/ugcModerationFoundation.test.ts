import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { PROTECTED_PREFIXES } from "../env/supabaseAuthGate";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260943_ugc_moderation_operator_actions_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("ugc operator moderation foundation", () => {
  const sql = read(MIGRATION);

  it("is additive and numbered 20260943", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(sql).toMatch(/add column if not exists resolved_by/);
    expect(sql).toMatch(/add column if not exists resolved_at/);
    expect(sql).toMatch(/add column if not exists operator_note/);
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).toMatch(/never supabase db push/i);
  });

  it("creates a fail-closed moderation_actions log", () => {
    expect(sql).toMatch(/create table if not exists public\.moderation_actions/);
    expect(sql).toMatch(/alter table public\.moderation_actions enable row level security;/);
    expect(sql).toMatch(/alter table public\.moderation_actions force row level security;/);
    expect(sql).toMatch(/revoke all on table public\.moderation_actions from anon;/);
    expect(sql).toMatch(/revoke all on table public\.moderation_actions from authenticated;/);
    expect(sql).toMatch(/grant select on table public\.moderation_actions to authenticated;/);
    expect(sql).not.toMatch(
      /grant (insert|update|delete|all) on table public\.moderation_actions to authenticated;/
    );
    expect(sql).toMatch(/using \(public\.is_platform_admin/);
  });

  it("guards operator RPCs with is_platform_admin and 42501", () => {
    for (const name of [
      "admin_resolve_ugc_report",
      "admin_set_user_moderation_status",
      "admin_takedown_post",
      "admin_restore_post",
      "admin_list_ugc_reports",
    ]) {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${name}`));
      expect(sql).toMatch(
        /raise exception 'Platform admin required'\s+using errcode = '42501'/
      );
    }
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/Cannot moderate your own account/);
    expect(sql).toMatch(/Cannot moderate a platform admin/);
    expect(sql).toMatch(/grant execute on function public\.admin_resolve_ugc_report/);
    expect(sql).toMatch(/grant execute on function public\.admin_takedown_post/);
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_resolve_ugc_report\(uuid, text, text\)\s+to anon/
    );
  });

  it("exposes guarded admin routes and does not index them", () => {
    expect(APP_ROUTES.admin).toBe("/admin");
    expect(APP_ROUTES.adminModeration).toBe("/admin/moderation");
    expect(PROTECTED_PREFIXES).toContain("/admin");
    expect(existsSync(join(ROOT, "app/admin/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/admin/moderation/page.tsx"))).toBe(true);
    expect(read("app/admin/page.tsx")).toMatch(/requirePlatformAdminPage/);
    expect(read("app/admin/moderation/page.tsx")).toMatch(
      /requirePlatformAdminPage/
    );
    expect(read("app/admin/requirePlatformAdminPage.ts")).toMatch(
      /assertPlatformAdminDb/
    );
  });

  it("wires web report controls to the existing UGC RPCs", () => {
    const action = read("app/actions/ugcReport.ts");
    expect(action).toMatch(/report_ugc_content/);
    expect(action).toMatch(/report_ugc_user/);
    expect(read("app/components/social/VideoMoreMenu.tsx")).toMatch(
      /UgcReportControl/
    );
    expect(read("app/components/video/VideoActionRail.tsx")).toMatch(
      /VideoMoreMenu/
    );
    expect(read("app/discover/components/DiscoverActionRail.tsx")).toMatch(
      /VideoMoreMenu/
    );
    expect(read("app/profile/components/ProfileActions.tsx")).toMatch(
      /UgcReportControl/
    );
  });
});
