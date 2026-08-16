/**
 * Purge post-videos for account-deletion request users only.
 * Default dry-run. Never deletes another user's prefix.
 */

import { createClient } from "@supabase/supabase-js";
import { purgeUserPostVideos } from "../../lib/accountDeletion/purgeUserPostVideos";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const userArg = process.argv.find((a) => a.startsWith("--user="));
  const explicitUser = userArg?.slice("--user=".length).trim() || "";
  const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const userIds: string[] = [];
  if (explicitUser) {
    userIds.push(explicitUser);
  } else {
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("user_id, status")
      .in("status", ["pending", "processing"]);
    if (error) {
      throw new Error("Unable to load account deletion requests.");
    }
    for (const row of data ?? []) {
      if (typeof row.user_id === "string" && row.user_id) {
        userIds.push(row.user_id);
      }
    }
  }

  const results = [];
  for (const userId of [...new Set(userIds)]) {
    results.push(
      await purgeUserPostVideos(supabase, userId, apply ? "apply" : "dry-run")
    );
  }
  console.log(JSON.stringify({ count: results.length, results }, null, 2));
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /accountDeletionMediaPurge\.(ts|js)$/.test(
    process.argv[1].replace(/\\/g, "/")
  );

if (isDirect) {
  main().catch((error) => {
    console.error("[account-deletion-media-purge] fatal", error);
    process.exitCode = 1;
  });
}
