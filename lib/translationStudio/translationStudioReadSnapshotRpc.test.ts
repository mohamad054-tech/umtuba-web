import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { TRANSLATION_STUDIO_READ_RPC_V1 } from "./persistence/readRpcContract";
import { parseTranslationStudioReadSnapshot } from "./persistence/readRpcContract";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations",
  TRANSLATION_STUDIO_READ_RPC_V1.migration
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

describe("Translation Studio read snapshot RPC migration V1", () => {
  const sql = read(MIGRATION);
  const body = stripSqlComments(sql);

  it("names the expected function and migration version 20260913", () => {
    expect(TRANSLATION_STUDIO_READ_RPC_V1.readSnapshot).toBe(
      "translation_studio_read_snapshot"
    );
    expect(TRANSLATION_STUDIO_READ_RPC_V1.migration).toContain("20260913");
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+public\.translation_studio_read_snapshot/i);
  });

  it("is SECURITY DEFINER with search_path=public and admin auth gates", () => {
    expect(body).toMatch(/security\s+definer/i);
    expect(body).toMatch(/search_path\s*=\s*public/i);
    expect(body).toMatch(/auth\.uid\(\)/i);
    expect(body).toMatch(/is_platform_admin/i);
    expect(body).toMatch(/Authentication required/i);
    expect(body).toMatch(/platform admin required/i);
  });

  it("returns schemaVersion 1 arrays with stable_id / language code identities", () => {
    expect(body).toMatch(/schemaVersion/);
    expect(body).toMatch(/'languages'/);
    expect(body).toMatch(/'namespaces'/);
    expect(body).toMatch(/'keys'/);
    expect(body).toMatch(/'values'/);
    expect(body).toMatch(/'auditLog'/);
    expect(body).toMatch(/stable_id/);
    expect(body).toMatch(/suggestion_stable_id/);
    expect(body).toMatch(/actor_kind/);
    expect(body).toMatch(/actor_ref/);
    expect(body).toMatch(/order by l\.code/i);
    expect(body).toMatch(/order by n\.stable_id/i);
  });

  it("revokes public/anon and grants execute to authenticated only; no DML widening", () => {
    expect(body).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.translation_studio_read_snapshot\s*\(\s*jsonb\s*\)\s+from\s+public/i
    );
    expect(body).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.translation_studio_read_snapshot\s*\(\s*jsonb\s*\)\s+from\s+anon/i
    );
    expect(body).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.translation_studio_read_snapshot\s*\(\s*jsonb\s*\)\s+to\s+authenticated/i
    );
    expect(body).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+table/i);
    expect(body).not.toMatch(/service_role/i);
    expect(body).not.toMatch(/translation_intelligence/i);
  });

  it("fails closed on prune_missing option", () => {
    expect(body).toMatch(/prune_missing is not supported/i);
  });

  it("parseTranslationStudioReadSnapshot validates schema", () => {
    expect(() => parseTranslationStudioReadSnapshot(null)).toThrow();
    expect(() =>
      parseTranslationStudioReadSnapshot({ schemaVersion: 2 })
    ).toThrow();
    const ok = parseTranslationStudioReadSnapshot({
      schemaVersion: 1,
      languages: [],
      namespaces: [],
      keys: [],
      suggestions: [],
      values: [],
      versions: [],
      memory: [],
      terminology: [],
      auditLog: [],
    });
    expect(ok.schemaVersion).toBe(1);
  });
});

describe("reconciliation admin action surface", () => {
  it("requires platform admin and uses read transport only", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/translationStudioReconciliation.ts"),
      "utf8"
    );
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).toMatch(/createSupabaseReadRpcTransport/);
    expect(src).toMatch(/buildStudioReconciliationReport/);
    expect(src).not.toMatch(/createServiceRole|SERVICE_ROLE|serviceRole/);
    expect(src).not.toMatch(/upsertSnapshot|translation_studio_upsert_snapshot/);
    expect(src).not.toMatch(/formData/);
  });
});
