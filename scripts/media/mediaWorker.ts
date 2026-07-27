/**
 * Generic Media Processing worker entry.
 *
 *   npx tsx scripts/media/mediaWorker.ts --processor=article_teaser
 *   npx tsx scripts/media/mediaWorker.ts --processor=article_teaser --once
 */

import { createClient } from "@supabase/supabase-js";
import {
  createMediaWorkerRuntime,
  ensureBuiltinMediaProcessorsRegistered,
  isMediaProcessorKind,
  type MediaProcessorKind,
} from "../../lib/media/processing";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function parseProcessorKind(): MediaProcessorKind {
  const arg = process.argv.find((a) => a.startsWith("--processor="));
  const raw = (arg?.slice("--processor=".length) || "article_teaser").trim();
  if (!isMediaProcessorKind(raw)) {
    throw new Error(`Unsupported processor: ${raw}`);
  }
  // Only article_teaser is registered in V1.
  if (raw !== "article_teaser") {
    throw new Error(`Processor not enabled in V1: ${raw}`);
  }
  return raw;
}

async function main() {
  const once = process.argv.includes("--once");
  const kind = parseProcessorKind();
  const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  ensureBuiltinMediaProcessorsRegistered(supabase);
  const runtime = createMediaWorkerRuntime(kind, { once, idlePollMs: 3000 });

  const onSignal = () => runtime.requestShutdown();
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  await runtime.loop();
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /mediaWorker\.(ts|js|mjs|cjs)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[media-worker] fatal", error);
    process.exitCode = 1;
  });
}

export { main as runMediaWorkerMain };
