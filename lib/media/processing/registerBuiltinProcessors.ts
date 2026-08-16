/**
 * Builtin processor registration — explicit startup wiring only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { registerMediaProcessor } from "./processorRegistry";
import { createArticleTeaserProcessor } from "./processors/articleTeaserProcessor";
import { createUgcVideoProcessor } from "./processors/ugcVideoProcessor";
import { listRegisteredMediaProcessors } from "./processorRegistry";

let registered = false;

export function ensureBuiltinMediaProcessorsRegistered(
  supabase: SupabaseClient
): void {
  const kinds = listRegisteredMediaProcessors();
  if (registered && kinds.includes("article_teaser") && kinds.includes("ugc_video")) {
    return;
  }
  // Fresh registration for this process (tests may reset registry).
  if (!listRegisteredMediaProcessors().includes("article_teaser")) {
    registerMediaProcessor(createArticleTeaserProcessor(supabase));
  }
  if (!listRegisteredMediaProcessors().includes("ugc_video")) {
    registerMediaProcessor(createUgcVideoProcessor(supabase));
  }
  registered = true;
}

export function resetBuiltinMediaProcessorFlagForTests(): void {
  registered = false;
}
