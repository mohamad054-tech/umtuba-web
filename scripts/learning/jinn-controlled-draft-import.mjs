/**
 * Controlled draft import runner — Jinn AI Academy.
 * Uses executeDraftCourseImport (approved RPC path).
 * Expects env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, JINN_IMPORT_OWNER_EMAIL, JINN_IMPORT_OWNER_ID.
 * Never logs secrets.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  executeDraftCourseImport,
  validateCourseManifest,
  planCourseImport,
  wrapSupabaseRpc,
} from "../../lib/learning/courseImport/index.ts";

const PROGRAM_ID = "27778f84-e7f0-4b0f-9578-5b68438e4a27";
const OWNER_ID = "87368553-5380-4ba1-ac64-d43d3d693482";
const MANIFEST_DIR =
  process.env.JINN_MANIFEST_DIR ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-course-with-questions-20260808\\manifests";
const OUT_DIR =
  process.env.JINN_IMPORT_OUT ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-controlled-draft-import-20260808";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function buildAuthedClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = requireEnv("JINN_IMPORT_OWNER_EMAIL");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (link.error) {
    throw new Error(`generateLink failed: ${link.error.message}`);
  }
  const tokenHash = link.data.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("generateLink returned no hashed_token");
  }

  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await userClient.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  if (verified.error) {
    throw new Error(`verifyOtp failed: ${verified.error.message}`);
  }
  const uid = verified.data.user?.id;
  if (uid !== OWNER_ID) {
    throw new Error(`Authenticated uid mismatch: got ${uid}`);
  }
  return userClient;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const only = process.env.JINN_IMPORT_ONLY; // e.g. JA-01
  const files = readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .filter((f) => !only || f.startsWith(only));

  console.log(
    JSON.stringify({
      phase: "start",
      manifest_dir: MANIFEST_DIR,
      files: files.length,
      program_id: PROGRAM_ID,
    })
  );

  const client = await buildAuthedClient();
  const rpc = wrapSupabaseRpc(client);
  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const abs = join(MANIFEST_DIR, file);
    const manifest = JSON.parse(
      readFileSync(abs, "utf8").replace(/^\uFEFF/, "")
    );
    if (manifest.program_id !== PROGRAM_ID) {
      console.error(
        JSON.stringify({
          phase: "blocked",
          file,
          reason: "program_id_mismatch",
          got: manifest.program_id,
        })
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
          findings: validation.findings.slice(0, 10),
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
      error_findings: result.findings.filter((f) => f.severity === "ERROR"),
      warning_findings: result.findings.filter((f) => f.severity === "WARNING"),
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
    JSON.stringify(
      {
        verdict: "BATCH_OK",
        courses: results.length,
        results,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(
    JSON.stringify({ phase: "batch_complete", courses: results.length })
  );
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
