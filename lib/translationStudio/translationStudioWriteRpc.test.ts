import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { TRANSLATION_STUDIO_WRITE_RPC_V1 } from "./persistence/writeRpcContract";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations",
  TRANSLATION_STUDIO_WRITE_RPC_V1.migration
);

const STUDIO_BASE = join(
  process.cwd(),
  "supabase/migrations/20260910_translation_studio_persistence_workflow_v1.sql"
);

const STABLE_ID = join(
  process.cwd(),
  "supabase/migrations/20260911_translation_studio_stable_identity_schema_v1.sql"
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string): string {
  const re = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\s*\\([\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$\\s*;`,
    "i"
  );
  const match = sql.match(re);
  if (!match) {
    throw new Error(`Function ${name} not found in migration`);
  }
  return match[0];
}

describe("Translation Studio Write RPC V1 — SQL contracts", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(
    fnBody(sql, TRANSLATION_STUDIO_WRITE_RPC_V1.upsertSnapshot)
  );

  it("exposes the expected RPC name", () => {
    expect(TRANSLATION_STUDIO_WRITE_RPC_V1.upsertSnapshot).toBe(
      "translation_studio_upsert_snapshot"
    );
    expect(sql).toMatch(
      /create or replace function public\.translation_studio_upsert_snapshot\s*\(\s*p_snapshot jsonb,\s*p_options jsonb/i
    );
  });

  it("is SECURITY DEFINER with fixed search_path and platform-admin auth", () => {
    expect(body).toMatch(/security definer/i);
    expect(body).toMatch(/set search_path\s*=\s*public/i);
    expect(body).toMatch(/auth\.uid\(\)/);
    expect(body).toMatch(/is_platform_admin\(v_uid\)/);
    expect(body).toMatch(/Not allowed: platform admin required/);
    expect(body).toMatch(/Authentication required/);
  });

  it("rejects unauthorized and invalid inputs fail-closed", () => {
    expect(body).toMatch(/Invalid snapshot: object required/);
    expect(body).toMatch(/Unsupported schemaVersion/);
    expect(body).toMatch(/prune_missing is not supported/);
    expect(body).toMatch(/Unknown key stable_id/);
    expect(body).toMatch(/Unknown language code/);
    expect(body).toMatch(/Invalid value status/);
  });

  it("uses stable_id for idempotent upserts", () => {
    expect(body).toMatch(/stable_id\s*=\s*v_stable/);
    expect(body).toMatch(/insert into public\.translation_studio_namespaces/);
    expect(body).toMatch(/insert into public\.translation_studio_keys/);
    expect(body).toMatch(/insert into public\.translation_studio_values/);
    expect(body).toMatch(/suggestion_stable_id/);
  });

  it("supports actor_kind / actor_ref for non-user actors", () => {
    expect(body).toMatch(/actor_kind/);
    expect(body).toMatch(/actor_ref/);
    expect(body).toMatch(/system:%/);
    expect(body).toMatch(/'user'/);
    expect(body).toMatch(/'system'/);
  });

  it("does not widen table privileges or create service-role grants", () => {
    const stripped = stripSqlComments(sql);
    expect(stripped).not.toMatch(
      /grant\s+(insert|update|delete|all)\b[\s\S]*translation_studio_/i
    );
    expect(stripped).not.toMatch(/service_role/i);
    expect(stripped).toMatch(
      /grant execute on function public\.translation_studio_upsert_snapshot\(jsonb, jsonb\) to authenticated;/i
    );
    expect(stripped).toMatch(
      /revoke all on function public\.translation_studio_upsert_snapshot\(jsonb, jsonb\) from (public|anon);/i
    );
  });

  it("does not touch Translation Intelligence", () => {
    expect(sql).not.toMatch(/translation_intelligence_/);
  });

  it("preserves base schema security posture (no RLS rewrites in this migration)", () => {
    const stripped = stripSqlComments(sql);
    expect(stripped).not.toMatch(/create policy/i);
    expect(stripped).not.toMatch(/alter table[\s\S]*enable row level security/i);
    expect(stripped).not.toMatch(/force row level security/i);
    // Base migrations still hold the posture
    const base = read(STUDIO_BASE);
    expect(base).toMatch(/force row level security/);
    expect(base).toMatch(/revoke all on table public\.translation_studio_values from anon, authenticated/);
    const stable = read(STABLE_ID);
    expect(stable).toMatch(/stable_id/);
    expect(stable).toMatch(/actor_kind/);
  });

  it("supports dry_run without prune deletes", () => {
    expect(body).toMatch(/v_dry_run/);
    expect(body).toMatch(/'dry_run'/);
    expect(body).toMatch(/prune_missing is not supported in write RPC v1/);
    expect(body).not.toMatch(/delete from public\.translation_studio_/i);
  });
});
