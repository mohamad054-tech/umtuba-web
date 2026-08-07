#!/usr/bin/env node
/**
 * Operator CLI — Learning Structured Course Import Foundation V1
 *
 * Modes:
 *   --validate
 *   --dry-run
 *   --import-draft   (requires --confirm-import-draft; needs SUPABASE URL+KEY env)
 *
 * Never prints service-role secrets. No publish command.
 */
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function usage() {
  console.log(`Usage:
  node scripts/learning/course-import.mjs --validate <manifest.json>
  node scripts/learning/course-import.mjs --dry-run <manifest.json>
  node scripts/learning/course-import.mjs --import-draft --confirm-import-draft <manifest.json>

Env for import-draft (optional until wired):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   (never logged)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) {
    usage();
    process.exit(0);
  }
  const mode = args.find((a) =>
    ["--validate", "--dry-run", "--import-draft"].includes(a)
  );
  const file = args.filter((a) => !a.startsWith("--")).pop();
  if (!mode || !file) {
    usage();
    process.exit(1);
  }
  const confirm = args.includes("--confirm-import-draft");
  const abs = resolve(process.cwd(), file);
  const manifest = JSON.parse(readFileSync(abs, "utf8"));

  // Dynamic import of compiled/ts via tsx or vitest path — prefer require of built modules through ts-node/register if present.
  let api;
  try {
    api = require("../../lib/learning/courseImport/index.ts");
  } catch {
    try {
      // When run under tsx / vitest node
      api = await import("../../lib/learning/courseImport/index.ts");
    } catch (e) {
      console.error(
        "Unable to load courseImport module. Run via: npx tsx scripts/learning/course-import.mjs ..."
      );
      console.error(String(e && e.message ? e.message : e));
      process.exit(2);
    }
  }

  const {
    validateCourseManifest,
    planCourseImport,
    executeDraftCourseImport,
    wrapSupabaseRpc,
  } = api;

  if (mode === "--validate") {
    const result = validateCourseManifest(manifest);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (mode === "--dry-run") {
    const plan = planCourseImport(manifest);
    console.log(JSON.stringify(plan, null, 2));
    process.exit(plan.ok ? 0 : 1);
  }

  if (mode === "--import-draft") {
    if (!confirm) {
      console.error("Refusing import without --confirm-import-draft");
      process.exit(1);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error(
        "Import draft requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (values not printed)."
      );
      process.exit(1);
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await executeDraftCourseImport({
      rpc: wrapSupabaseRpc(supabase),
      manifest,
      confirmImportDraft: true,
    });
    // Redact any accidental env leakage
    const safe = JSON.parse(
      JSON.stringify(result).replaceAll(key, "[REDACTED]")
    );
    console.log(JSON.stringify(safe, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
