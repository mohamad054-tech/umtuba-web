import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NS = "UMTUBA_LEARNING_E2E_20260803";

const PATHS = {
  configExample: "scripts/learning-e2e/config.example.sql",
  seed: "scripts/learning-e2e/seed-learning-sandbox.sql",
  verify: "scripts/learning-e2e/verify-learning-sandbox.sql",
  cleanup: "scripts/learning-e2e/cleanup-learning-sandbox.sql",
  access: "scripts/learning-e2e/run-access-checks.sql",
  publicCatalog: "scripts/learning-smoke/verify-public-catalog.sql",
  gateRunner: "scripts/learning-smoke/run-gate.mjs",
  rpcSmoke: "scripts/learning-smoke/rpc-smoke.mjs",
  doc: "docs/learning/operations/LEARNING_REMOTE_SMOKE_E2E_GATE_V1.md",
} as const;

const FIXED_COURSE = "e2e60803-2026-4000-8000-000000000003";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function executableSql(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .replace(/'(?:''|[^'])*'/g, "''");
}

describe("learning remote E2E sandbox scripts", () => {
  it("ships required SQL + operator doc + smoke runners", () => {
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
    expect(seed).toContain(FIXED_COURSE);
  });

  it("cleanup targets fixed UUIDs / marker and avoids truncate", () => {
    const cleanup = read(PATHS.cleanup);
    const exec = executableSql(cleanup);
    expect(cleanup).toContain(FIXED_COURSE);
    expect(cleanup).toContain(NS);
    expect(exec).not.toMatch(/\btruncate\b/i);
    expect(cleanup).toMatch(/Never truncate|Never DELETE without sandbox/i);
  });

  it("verify and access checks stay seed-gated / read-oriented", () => {
    const verify = read(PATHS.verify);
    const access = read(PATHS.access);
    const catalog = read(PATHS.publicCatalog);
    expect(executableSql(verify)).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(access).toContain("SEED_REQUIRED");
    expect(catalog.toLowerCase()).not.toMatch(/\b(insert|update|delete|truncate)\b/);
  });

  it("documents credential policy and no LiveKit / Commerce scope", () => {
    const doc = read(PATHS.doc);
    expect(doc).toMatch(/LEARNING_E2E/);
    expect(doc).toMatch(/SKIPPED_NO_CREDENTIALS|credentials/i);
    expect(doc).toMatch(/LiveKit/);
    expect(doc).toMatch(/No Commerce|Commerce/i);
    expect(doc).toContain(NS);
  });
});
