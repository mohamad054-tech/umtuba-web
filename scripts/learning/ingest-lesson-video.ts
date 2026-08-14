/**
 * Controlled lesson video ingest CLI (manager JWT required via env).
 *
 * Does NOT invent media. Requires a real HTTPS playback URL.
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  OR user access token via SUPABASE_ACCESS_TOKEN
 *   (Prefer a manager user token in production ops; service role only for ops.)
 *
 * Args:
 *   --lesson-id <uuid>
 *   --url <https://...>
 *   --provider <upload|youtube|vimeo|...>
 *   --caption <text>
 */

import { createClient } from "@supabase/supabase-js";
import { ingestLessonVideoBlock } from "../../lib/learning/lessonVideoIngestion";

function arg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const lessonId = arg("--lesson-id");
  const url = arg("--url");
  const provider = arg("--provider");
  const caption = arg("--caption");
  if (!lessonId || !url) {
    console.error(
      "Usage: npx tsx scripts/learning/ingest-lesson-video.ts --lesson-id <uuid> --url <https://...> [--provider upload] [--caption text]"
    );
    process.exit(2);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) {
    console.error("Missing Supabase URL/key env");
    process.exit(2);
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await ingestLessonVideoBlock(supabase, {
    lesson_id: lessonId,
    playback_url: url,
    provider,
    caption,
    publish: true,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
