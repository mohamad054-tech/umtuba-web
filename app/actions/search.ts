"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  clearRecentSearches,
  listRecentSearches,
  rememberRecentSearch,
  runGlobalSearch,
  type RunGlobalSearchResult,
} from "../../lib/search/queries";
import { SEARCH_ERRORS } from "../../lib/search/errors";
import { parseSearchTab } from "../../lib/search";
import type { RecentSearchItem } from "../../lib/search/types";

export type GlobalSearchActionInput = {
  query: string;
  tab?: string;
  limit?: number;
  /** Persist into recent searches when authenticated. */
  remember?: boolean;
};

export async function globalSearchAction(
  input: GlobalSearchActionInput
): Promise<RunGlobalSearchResult> {
  const user = await getServerUser().catch(() => null);
  const supabase = await createClient();
  const tab = parseSearchTab(input.tab);

  const result = await runGlobalSearch(supabase, {
    query: typeof input.query === "string" ? input.query : "",
    tab,
    limit: input.limit,
    viewerId: user?.id ?? null,
  });

  if (
    result.ok &&
    input.remember !== false &&
    user &&
    result.result.query.trim()
  ) {
    await rememberRecentSearch(supabase, user.id, result.result.query, tab);
  }

  return result;
}

export type RecentSearchesActionResult =
  | { ok: true; items: RecentSearchItem[] }
  | { ok: false; message: string };

export async function recentSearchesAction(): Promise<RecentSearchesActionResult> {
  const user = await getServerUser().catch(() => null);
  if (!user) {
    return { ok: true, items: [] };
  }
  const supabase = await createClient();
  return listRecentSearches(supabase, user.id);
}

export type ClearRecentSearchesActionResult =
  | { ok: true }
  | { ok: false; message: string; code?: "auth_required" };

export async function clearRecentSearchesAction(): Promise<ClearRecentSearchesActionResult> {
  const user = await getServerUser().catch(() => null);
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: SEARCH_ERRORS.authRequired,
    };
  }
  const supabase = await createClient();
  return clearRecentSearches(supabase, user.id);
}
