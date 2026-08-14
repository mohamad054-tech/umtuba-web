/**
 * Controlled draft import via `supabase db query --linked` + auth.uid() JWT claim.
 * Uses executeDraftCourseImport RPC names (no ad-hoc INSERT).
 * No API keys required.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  executeDraftCourseImport,
  validateCourseManifest,
  planCourseImport,
  type CourseImportRpcPort,
} from "../../lib/learning/courseImport/index.ts";

const PROGRAM_ID = "27778f84-e7f0-4b0f-9578-5b68438e4a27";
const OWNER_ID = "87368553-5380-4ba1-ac64-d43d3d693482";
const WT =
  process.env.JINN_LEARNING_WT ||
  "D:\\umtuba-central\\repos\\umtuba-web-learning-sot-ff-merge-v1";
const MANIFEST_DIR =
  process.env.JINN_MANIFEST_DIR ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-course-with-questions-20260808\\manifests";
const OUT_DIR =
  process.env.JINN_IMPORT_OUT ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-controlled-draft-import-20260808";

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") {
    const json = JSON.stringify(v).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function buildRpcSql(fn: string, args?: Record<string, unknown>): string {
  const entries = Object.entries(args ?? {});
  const argSql = entries
    .map(([k, v]) => `${k} := ${sqlLiteral(v)}`)
    .join(", ");
  return `
select set_config('request.jwt.claim.sub', '${OWNER_ID}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.${fn}(${argSql}) as data;
`.trim();
}

function runDbQuery(sql: string): { data: unknown; error: { message: string } | null } {
  const dir = mkdtempSync(join(tmpdir(), "jinn-rpc-"));
  const sqlPath = join(dir, "q.sql");
  const outPath = join(dir, "q.out.json");
  writeFileSync(sqlPath, sql, "utf8");
  const res = spawnSync(
    "npx",
    [
      "supabase",
      "db",
      "query",
      "--linked",
      "-f",
      sqlPath,
      "--output-format",
      "json",
    ],
    {
      cwd: WT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      shell: true,
    }
  );
  const combined = `${res.stdout || ""}\n${res.stderr || ""}`;
  writeFileSync(outPath, combined, "utf8");
  const start = combined.indexOf("{");
  if (start < 0) {
    return {
      data: null,
      error: {
        message: `db query returned no JSON (exit ${res.status}): ${combined.slice(0, 500)}`,
      },
    };
  }
  try {
    const parsed = JSON.parse(combined.slice(start));
    if (parsed?._tag === "Error" || parsed?.error) {
      return {
        data: null,
        error: {
          message:
            parsed?.error?.message ||
            parsed?.message ||
            JSON.stringify(parsed).slice(0, 500),
        },
      };
    }
    const rows = parsed.rows || [];
    // last row should contain data from RPC select
    const last = rows[rows.length - 1];
    if (last && Object.prototype.hasOwnProperty.call(last, "data")) {
      return { data: last.data, error: null };
    }
    // sometimes RPC result is the row itself
    if (rows.length === 1) return { data: rows[0], error: null };
    return { data: rows.length ? rows : null, error: null };
  } catch (e) {
    return {
      data: null,
      error: {
        message: `JSON parse failed: ${(e as Error).message}; body=${combined.slice(0, 400)}`,
      },
    };
  }
}

function makeRpcPort(): CourseImportRpcPort {
  return {
    async rpc(fn, args) {
      return runDbQuery(buildRpcSql(fn, args));
    },
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const only = process.env.JINN_IMPORT_ONLY;
  const files = readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .filter((f) => !only || f.startsWith(only));

  console.log(
    JSON.stringify({
      phase: "start",
      mode: "db_query_rpc_port",
      files: files.length,
      program_id: PROGRAM_ID,
    })
  );

  const rpc = makeRpcPort();
  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const abs = join(MANIFEST_DIR, file);
    const manifest = JSON.parse(
      readFileSync(abs, "utf8").replace(/^\uFEFF/, "")
    );
    if (manifest.program_id !== PROGRAM_ID) {
      console.error(
        JSON.stringify({ phase: "blocked", file, reason: "program_id_mismatch" })
      );
      process.exit(3);
    }
    const validation = validateCourseManifest(manifest);
    if (!validation.ok) {
      console.error(
        JSON.stringify({
          phase: "blocked",
          file,
          reason: "validation_failed",
          findings: validation.findings.slice(0, 8),
        })
      );
      process.exit(3);
    }
    const plan = planCourseImport(manifest);
    console.log(
      JSON.stringify({
        phase: "importing",
        file,
        fingerprint: plan.manifest_fingerprint,
        counts: plan.counts,
      })
    );

    const t0 = Date.now();
    const result = await executeDraftCourseImport({
      rpc,
      manifest,
      confirmImportDraft: true,
    });
    const summary = {
      file,
      ok: result.ok,
      status: result.status,
      course_id: result.course_id ?? null,
      mutation_count: result.mutation_count,
      created_keys: Object.keys(result.created).length,
      elapsed_ms: Date.now() - t0,
      error_findings: result.findings.filter((f) => f.severity === "ERROR").slice(0, 20),
      warning_findings: result.findings
        .filter((f) => f.severity === "WARNING")
        .slice(0, 20),
    };
    results.push(summary);
    writeFileSync(
      join(OUT_DIR, `${file}.import-result.json`),
      JSON.stringify({ summary, result }, null, 2),
      "utf8"
    );
    console.log(JSON.stringify({ phase: "course_done", ...summary }));
    if (!result.ok) {
      writeFileSync(
        join(OUT_DIR, "STOP_SUMMARY.json"),
        JSON.stringify(
          {
            verdict: "IMPORT_FAILED_NO_SAFE_CONTINUATION",
            stopped_at: file,
            results,
          },
          null,
          2
        ),
        "utf8"
      );
      process.exit(1);
    }
  }

  writeFileSync(
    join(OUT_DIR, "IMPORT_BATCH_SUMMARY.json"),
    JSON.stringify({ verdict: "BATCH_OK", courses: results.length, results }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify({ phase: "batch_complete", courses: results.length }));
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      phase: "fatal",
      message: err && err.message ? err.message : String(err),
    })
  );
  process.exit(2);
});
