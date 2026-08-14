import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260920_learning_lesson_engine_o_course_rpc_hotfix_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/gi),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

describe("LEARNING_LESSON_ENGINE_O_COURSE_RPC_HOTFIX_V1", () => {
  it("ships unique migration 20260920", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const migrations = readdirSync(join(ROOT, "supabase/migrations")).filter(
      (f) => f.endsWith(".sql")
    );
    const same = migrations.filter((f) => f.startsWith("20260920_"));
    expect(same).toEqual([
      "20260920_learning_lesson_engine_o_course_rpc_hotfix_v1.sql",
    ]);
  });

  it("adds jsonb composite helpers and rewrites critical learner RPCs", () => {
    const sql = read(MIGRATION);
    const body = stripSqlComments(sql);

    expect(body).toMatch(
      /create or replace function public\.learning_composite_id\(/i
    );
    expect(body).toMatch(
      /create or replace function public\.learning_composite_text\(/i
    );
    expect(body).toMatch(
      /grant execute on function public\.learning_composite_id\(jsonb, text\)\s+to authenticated, service_role/i
    );
    expect(body).toMatch(
      /revoke all on function public\.learning_composite_id\(jsonb, text\)\s+from public, anon/i
    );

    for (const name of [
      "get_my_learning_lesson_engine",
      "get_my_learning_lesson_unlock_state",
      "start_learning_lesson",
    ]) {
      const fn = stripSqlComments(fnBody(sql, name));
      expect(fn).not.toMatch(/v_ctx\.o_course\.id/);
      expect(fn).not.toMatch(/v_ctx\.o_lesson\./);
      expect(fn).toMatch(
        /learning_composite_id\(to_jsonb\(v_ctx\),\s*'o_course'\)/
      );
      expect(fn).toMatch(/has_learning_course_access/);
      expect(fn).toMatch(/auth\.uid\(\)/);
    }

    const engine = stripSqlComments(
      fnBody(sql, "get_my_learning_lesson_engine")
    );
    expect(engine).toMatch(
      /learning_composite_text\(to_jsonb\(v_ctx\),\s*'o_lesson',\s*'name'\)/
    );
    expect(engine).toMatch(/get_my_learning_lesson_unlock_state/);
  });

  it("does not weaken grants on helpers to anon", () => {
    const body = stripSqlComments(read(MIGRATION));
    expect(body).not.toMatch(
      /grant execute on function public\.learning_composite_id\(jsonb, text\)\s+to[^;]*\banon\b/i
    );
    expect(body).not.toMatch(
      /grant execute on function public\.learning_composite_text\(jsonb, text, text\)\s+to[^;]*\banon\b/i
    );
  });
});
