/**
 * Builtin processor registration — explicit startup wiring only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { registerMediaProcessor } from "./processorRegistry";
import { createArticleTeaserProcessor } from "./processors/articleTeaserProcessor";
import { listRegisteredMediaProcessors } from "./processorRegistry";

let registered = false;

export function ensureBuiltinMediaProcessorsRegistered(
  supabase: SupabaseClient
): void {
  if (registered && listRegisteredMediaProcessors().includes("article_teaser")) {
    return;
  }
  // Fresh registration for this process (tests may reset registry).
  if (!listRegisteredMediaProcessors().includes("article_teaser")) {
    registerMediaProcessor(createArticleTeaserProcessor(supabase));
  }
  registered = true;
}

export function resetBuiltinMediaProcessorFlagForTests(): void {
  registered = false;
}
