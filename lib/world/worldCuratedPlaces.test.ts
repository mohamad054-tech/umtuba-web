import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260929_world_platform_curated_places_v1.sql";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("World platform-curated place ownership migration", () => {
  it("exists as an additive idempotent migration after World hardening", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/alter column owner_user_id drop not null/);
    expect(sql).toMatch(/add column if not exists curated_by/);
    expect(sql).toMatch(/add column if not exists provenance_kind/);
    expect(sql).toMatch(/world_places_owner_or_platform_check/);
    expect(sql).toMatch(/create or replace function public\.protect_world_place_authority/);
  });

  it("keeps user-owned places and forbids fake catalog users", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/curated_by = 'owner'\s+and owner_user_id is not null/);
    expect(sql).toMatch(/curated_by = 'platform'\s+and source_type = 'platform'/);
    expect(sql).toMatch(/Catalog ingest may only insert platform-curated places with a null owner/);
    expect(sql).not.toMatch(/insert into auth\.users/i);
    expect(sql).toMatch(/Never invent auth\.users/);
  });

  it("gates catalog ingest with GUC or service_role and keeps draft/published reversible", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/umtuba\.world_catalog_ingest/);
    expect(sql).toMatch(/auth\.role\(\), ''\) = 'service_role'/);
    expect(sql).toMatch(/Published world places are public/);
    expect(sql).toMatch(/is_public_world_place\(id\)/);
    expect(sql).toMatch(/curated_by = 'owner'/);
    expect(sql).toMatch(/source_type is distinct from 'platform'/);
    expect(sql).toMatch(/nearby_places_enabled is intentionally untouched/);
    expect(sql).not.toMatch(/nearby_places_enabled',\s*true/);
    expect(sql).not.toMatch(/admin_set_world_feature_flag/);
  });

  it("does not call is_platform_admin in the anon public-read policy", () => {
    const sql = read(MIGRATION);
    const start = sql.indexOf('create policy "Published world places are public"');
    const end = sql.indexOf(
      'drop policy if exists "Business owners create world places"'
    );
    const policy = sql.slice(start, end);
    expect(policy).toContain("to anon, authenticated");
    expect(policy).toContain("is_public_world_place(id)");
    expect(policy).not.toContain("is_platform_admin");
  });
});
