import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260944_ugc_post_viewer_visibility_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const SURFACE_FILES = [
  "lib/supabase/videoPostsServer.ts",
  "lib/supabase/followingFeed.ts",
  "lib/supabase/profileContent.ts",
  "lib/search/queries.ts",
  "lib/supabase/publicVideoSeo.ts",
  "app/actions/socialInteractions.ts",
  "lib/store/videoCommerceQueries.ts",
] as const;

describe("ugc post viewer visibility foundation", () => {
  const sql = read(MIGRATION);

  it("is numbered 20260944, print-only, and does not touch RLS", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(sql).toMatch(/never supabase db push/i);
    expect(sql).toMatch(/Do not change RLS/i);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).toMatch(/create or replace function public\.post_is_visible_to_viewer/);
    expect(sql).toMatch(/create or replace function public\.post_is_interactable/);
  });

  it("gates profile counts, interactions, and journey through the SQL helpers", () => {
    expect(sql).toMatch(
      /create or replace function public\.get_profile_content_stats/
    );
    expect(sql).toMatch(/post_is_visible_to_viewer\(/);
    expect(sql).toMatch(/create or replace function public\.toggle_post_like/);
    expect(sql).toMatch(/create or replace function public\.toggle_post_save/);
    expect(sql).toMatch(/create or replace function public\.record_post_share/);
    expect(sql).toMatch(/create or replace function public\.record_post_view/);
    expect(sql).toMatch(/create or replace function public\.report_ugc_content/);
    expect(sql).toMatch(/create or replace function public\.get_post_journey/);
    expect(sql.match(/post_is_interactable\(p_post_id\)/g)?.length).toBeGreaterThanOrEqual(
      5
    );
  });

  it("wires applyViewerVisibility on every listed public surface", () => {
    for (const rel of SURFACE_FILES) {
      const source = read(rel);
      expect(source).toMatch(/applyViewerVisibility/);
      expect(source).toMatch(/postsSelectVisible/);
    }
    expect(read("lib/supabase/videoPostsServer.ts").match(/applyViewerVisibility/g)?.length).toBeGreaterThanOrEqual(
      6
    );
    expect(read("lib/supabase/profileContent.ts").match(/applyViewerVisibility/g)?.length).toBeGreaterThanOrEqual(
      4
    );
    expect(read("lib/supabase/publicVideoSeo.ts")).toMatch(
      /applyViewerVisibility\(\s*[\s\S]*null/
    );
    expect(read("app/sitemap.ts")).toMatch(/indexableOnly:\s*true/);
    expect(read("lib/content/services/profileProjectionService.ts")).toMatch(
      /applyViewerVisibility/
    );
    expect(read("lib/supabase/rewards.ts")).toMatch(/applyViewerVisibility/);
    expect(read("lib/supabase/socialInteractions.ts")).toMatch(
      /isPostInteractable/
    );
  });

  it("keeps the admin queue unfiltered and does not widen public admin access", () => {
    expect(read("lib/moderation/adminQueries.ts")).not.toMatch(
      /applyViewerVisibility|isPostVisibleToViewer/
    );
    expect(read("app/admin/moderation/page.tsx")).not.toMatch(
      /applyViewerVisibility|isPostVisibleToViewer/
    );
    expect(read("lib/supabase/postVisibility.ts")).toMatch(
      /must not call these helpers/
    );
  });
});
