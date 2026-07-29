import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NS = "UMTUBA_E2E_20260721";

const PATHS = {
  configExample: "scripts/store-e2e/config.example.sql",
  seed: "scripts/store-e2e/seed-store-sandbox.sql",
  verify: "scripts/store-e2e/verify-store-sandbox.sql",
  cleanup: "scripts/store-e2e/cleanup-store-sandbox.sql",
  gateOff: "scripts/store-e2e/run-gate-off-checks.sql",
  doc: "docs/store/operations/STORE_REMOTE_E2E_SANDBOX_V1.md",
} as const;

const FIXED = {
  store: "e2e02107-2026-4001-8000-000000000001",
  application: "e2e02107-2026-4001-8000-000000000002",
  coupon: "e2e02107-2026-4001-8000-000000000041",
} as const;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Strip SQL comments + string literals so prohibition text is not a false positive. */
function executableSql(sql: string) {
  // Normalize CRLF first so `--` line comments are stripped on Windows checkouts.
  return sql
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .replace(/'(?:''|[^'])*'/g, "''");
}

describe("store remote E2E sandbox scripts", () => {
  it("ships required SQL + operator doc files", () => {
    for (const rel of Object.values(PATHS)) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("embeds namespace marker across scripts and doc", () => {
    for (const rel of Object.values(PATHS)) {
      expect(read(rel), rel).toContain(NS);
    }
  });

  it("seed aborts with ACCOUNT_BLOCKER and never inserts auth.users", () => {
    const seed = read(PATHS.seed);
    const exec = executableSql(seed);
    expect(seed).toContain("ACCOUNT_BLOCKER");
    expect(seed).toMatch(/SAFETY_ABORT/);
    expect(exec).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(exec).not.toMatch(/\btruncate\b/i);
    expect(exec).not.toMatch(/commerce_confirm_enabled\s*=\s*1/i);
    expect(exec).not.toMatch(/admin_set_commerce_confirm_enabled\s*\(\s*true/i);
  });

  it("cleanup targets fixed UUIDs / marker and avoids truncate", () => {
    const cleanup = read(PATHS.cleanup);
    const exec = executableSql(cleanup);
    expect(cleanup).toContain(FIXED.store);
    expect(cleanup).toContain(FIXED.application);
    expect(cleanup).toContain(FIXED.coupon);
    expect(cleanup).toContain(NS);
    expect(cleanup).toContain("UMTUBA_E2E_20260721");
    expect(cleanup).toContain("E2E20260721");
    expect(exec).not.toMatch(/\btruncate\b/i);
    expect(cleanup).toContain("umtuba.e2e_cleanup_admin");
    expect(cleanup).toMatch(/Never DELETE without sandbox identifiers|Never truncate/i);
  });

  it("verify and gate-off checks stay read-only / seed-gated", () => {
    const verify = read(PATHS.verify);
    const gateOff = read(PATHS.gateOff);
    expect(verify).toContain("commerce_confirm_enabled");
    expect(verify).toContain("reserved");
    expect(executableSql(verify)).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(gateOff).toContain("SEED_REQUIRED");
    expect(gateOff).toContain("assert_store_commerce_confirm_allowed");
    expect(gateOff).toMatch(/buyer JWT|buyer session/i);
  });

  it("documents deferred/none payment mapping (DEFERRED_TEST)", () => {
    const doc = read(PATHS.doc);
    expect(doc).toMatch(/DEFERRED_TEST/);
    expect(doc).toMatch(/provider\s*=\s*'none'|provider = 'none'/);
    expect(doc).toMatch(/method_kind\s*=\s*'deferred'|method_kind = 'deferred'/);
    expect(doc).toContain("admin_set_commerce_confirm_enabled(false)");
    expect(doc).toMatch(/personal gmails|Do not reuse personal gmails/i);
    expect(doc).toContain("ACCOUNT_BLOCKER");
  });

  it("records PASS WITH NOTES and CONCURRENCY_NOT_PROVEN accurately", () => {
    const doc = read(PATHS.doc);
    expect(doc).toMatch(/PASS WITH NOTES/);
    expect(doc).toMatch(/CONCURRENCY_NOT_PROVEN/);
    expect(doc).toMatch(/not a proven database oversell defect/i);
    expect(doc).toMatch(/20260809–20260821|20260809-20260821/);
    expect(doc).toMatch(/commerce_confirm_enabled = 0/);
    expect(doc).toMatch(/reserved = 0/);
    expect(doc).toMatch(/Safety close immediately|mandatory/i);
  });

  it("config example documents GUC placeholders and local copy", () => {
    const cfg = read(PATHS.configExample);
    expect(cfg).toContain("umtuba.e2e_seller_user_id");
    expect(cfg).toContain("umtuba.e2e_buyer_user_id");
    expect(cfg).toContain("umtuba.e2e_admin_user_id");
    expect(cfg).toContain("config.local.sql");
    expect(cfg).toContain("gitignored");
  });
});
