/**
 * Article Auto-Teaser worker — thin entry over Media Processing Runtime.
 *
 * Prefer:
 *   npx tsx scripts/media/mediaWorker.ts --processor=article_teaser --once
 *
 * Compat:
 *   npx tsx scripts/media/articleTeaserWorker.ts --once
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createArticleTeaserProcessor,
  createMediaWorkerRuntime,
  createTempWorkspace,
  ensureBuiltinMediaProcessorsRegistered,
  type MediaJobRef,
} from "../../lib/media/processing";
import type { TeaserBackgroundMode } from "../../lib/articles/articleTeaserFoundation";

type ClaimedJob = {
  id: string;
  article_id: string;
  owner_user_id: string;
  status: string;
  teaser_source: string;
  background_mode: TeaserBackgroundMode;
  background_asset_path: string | null;
  audio_mode: string;
  generated_video_path: string | null;
  generated_post_id: number | null;
  attempt_count: number;
};

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function createServiceClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toJobRef(job: ClaimedJob): MediaJobRef {
  return {
    jobId: job.id,
    processorKind: "article_teaser",
    attemptCount: job.attempt_count,
    payload: {
      article_id: job.article_id,
      owner_user_id: job.owner_user_id,
      status: job.status,
      teaser_source: job.teaser_source,
      background_mode: job.background_mode,
      background_asset_path: job.background_asset_path,
      audio_mode: job.audio_mode,
      generated_video_path: job.generated_video_path,
      generated_post_id: job.generated_post_id,
    },
  };
}

/** Compat export — processes an already-claimed job via the processor. */
export async function processClaimedJob(
  supabase: SupabaseClient,
  job: ClaimedJob
): Promise<"ready" | "failed"> {
  ensureBuiltinMediaProcessorsRegistered(supabase);
  const processor = createArticleTeaserProcessor(supabase);
  const workspace = await createTempWorkspace("umtuba-teaser-");
  const abort = new AbortController();
  const ctx = {
    signal: abort.signal,
    workDir: workspace.workDir,
    attemptCount: job.attempt_count,
    reportProgress: () => undefined,
    log: () => undefined,
  };
  try {
    const ref = toJobRef(job);
    const validated = await processor.validate(ref);
    if (!validated.ok) {
      await processor.fail(ref, { code: validated.code, kind: "permanent" }, ctx);
      return "failed";
    }
    const executed = await processor.execute(ref, ctx);
    if (!executed.ok) {
      await processor.fail(ref, executed.error, ctx);
      return "failed";
    }
    const finalized = await processor.finalize(ref, ctx);
    if (!finalized.ok) {
      await processor.fail(ref, finalized.error, ctx);
      return "failed";
    }
    return "ready";
  } finally {
    await processor.cleanup(toJobRef(job), workspace.workDir);
    await workspace.cleanup();
  }
}

async function main() {
  const once = process.argv.includes("--once");
  const supabase = createServiceClient();
  ensureBuiltinMediaProcessorsRegistered(supabase);
  const runtime = createMediaWorkerRuntime("article_teaser", {
    once,
    idlePollMs: 3000,
  });

  const onSignal = () => runtime.requestShutdown();
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  console.log("[article-teaser-worker] started via media runtime", once ? "(once)" : "(loop)");
  await runtime.loop();
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /articleTeaserWorker\.(ts|js|mjs|cjs)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[article-teaser-worker] fatal", error);
    process.exitCode = 1;
  });
}
