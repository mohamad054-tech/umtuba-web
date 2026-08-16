/**
 * Safe orphan sweep for post-videos.
 * Default is dry-run. Pass --apply to delete unreferenced objects only.
 */

import { createClient } from "@supabase/supabase-js";
import { runOrphanPostVideoCleanup } from "../../lib/media/ugc/orphanPostVideos";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const result = await runOrphanPostVideoCleanup(
    supabase,
    apply ? "apply" : "dry-run"
  );
  console.log(
    JSON.stringify(
      {
        mode: result.mode,
        referencedCount: result.referencedCount,
        objectCount: result.objectCount,
        orphanCount: result.orphanPaths.length,
        deletedCount: result.deletedPaths.length,
        orphanPaths: result.orphanPaths,
      },
      null,
      2
    )
  );
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /orphanPostVideos\.(ts|js)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[orphan-post-videos] fatal", error);
    process.exitCode = 1;
  });
}
