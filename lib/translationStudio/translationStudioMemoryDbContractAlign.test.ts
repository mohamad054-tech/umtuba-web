import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  buildSeedPersistedState,
  fingerprintStudioSnapshot,
  sourceFingerprint,
  toTranslationStudioWriteSnapshot,
} from "./index";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260914_translation_studio_memory_identity_contract_align_v1.sql"
);

const CANONICAL_HASH =
  "d25ea88afbea9587d4dbe44e9197bc9f4fd9187ffbb75e1c3e9700af1bccb1ba";

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

describe("Translation Studio memory DB contract align V1", () => {
  it("documents the original unique-constraint failure case in seed memory", () => {
    const state = buildSeedPersistedState();
    const cancelRows = state.memory.filter(
      (m) =>
        m.language === "ar" &&
        sourceFingerprint(m.sourceText) === sourceFingerprint("Cancel")
    );
    // Multiple key-scoped rows share fingerprint "cancel" — this is the
    // payload shape that tripped translation_studio_memory_fp_lang_unique.
    expect(cancelRows.length).toBeGreaterThan(1);
    expect(new Set(cancelRows.map((m) => m.id)).size).toBe(cancelRows.length);
  });

  it("serializes all 88 seed memory rows with required write-RPC fields", () => {
    const snap = toTranslationStudioWriteSnapshot(buildSeedPersistedState());
    expect(snap.memory).toHaveLength(88);
    for (const m of snap.memory) {
      expect(m.id.length).toBeGreaterThan(0);
      expect(m.sourceFingerprint.length).toBeGreaterThan(0);
      expect(m.language).toBeTruthy();
      expect(m.translatedText.length).toBeGreaterThan(0);
      expect(m.status).toBe("approved");
    }
    const ids = snap.memory.map((m) => m.id);
    expect(new Set(ids).size).toBe(88);
  });

  it("keeps canonical seed hash stable (no identity/content change)", () => {
    expect(fingerprintStudioSnapshot(buildSeedPersistedState())).toBe(
      CANONICAL_HASH
    );
  });

  it("migration drops fp+lang unique and does not widen DML/auth", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const body = stripSqlComments(sql);
    expect(sql).toContain("20260914");
    expect(body).toMatch(
      /drop\s+constraint\s+if\s+exists\s+translation_studio_memory_fp_lang_unique/i
    );
    expect(body).toMatch(
      /create\s+index\s+if\s+not\s+exists\s+translation_studio_memory_fp_lang_idx/i
    );
    expect(body).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+table/i);
    expect(body).not.toMatch(/service_role/i);
    expect(body).not.toMatch(/translation_intelligence/i);
    expect(body).not.toMatch(/create\s+or\s+replace\s+function/i);
    expect(body).not.toMatch(/enable\s+row\s+level\s+security/i);
  });

  it("maps TypeScript memory fields to write snapshot JSON field names", () => {
    const m = toTranslationStudioWriteSnapshot(buildSeedPersistedState())
      .memory[0]!;
    const keys = Object.keys(m).sort();
    expect(keys).toEqual(
      [
        "createdAt",
        "createdBy",
        "id",
        "language",
        "namespaceId",
        "sourceFingerprint",
        "sourceText",
        "status",
        "translatedText",
      ].sort()
    );
  });
});
