import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildPostNotificationHref,
  buildStoreProductIdHref,
  buildStoreShopIdHref,
} from "../../app/lib/nav/routes";
import { SEARCH_ERRORS, searchUserMessage } from "./errors";
import {
  filterResultsByTab,
  groupResultsByTab,
  isSearchableProductRow,
  isSearchableStoreRow,
  isSearchableStoryRow,
  isSearchableVideoRow,
} from "./filters";
import { rankCandidates } from "./ranking";
import type {
  GlobalSearchResult,
  RankableCandidate,
  RecentSearchItem,
  SearchTab,
} from "./types";
import {
  clampSearchLimit,
  quotedIlikePattern,
  validateSearchQuery,
} from "./validation";

type AnyClient = SupabaseClient;

async function searchPeople(
  supabase: AnyClient,
  term: string,
  limit: number
): Promise<RankableCandidate[]> {
  const pattern = quotedIlikePattern(term);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, full_name, avatar_url, created_at")
    .or(
      `username.ilike.${pattern},display_name.ilike.${pattern},full_name.ilike.${pattern}`
    )
    .limit(limit);

  if (error) {
    console.error("searchPeople", error);
    return [];
  }

  const candidates: RankableCandidate[] = [];
  for (const row of data ?? []) {
    const username = ((row.username as string | null) ?? "").trim();
    // Skip profiles without a public username to avoid dead /profile links.
    if (!username) continue;
    const display =
      (row.display_name as string | null) ||
      (row.full_name as string | null) ||
      username;
    candidates.push({
      id: String(row.id),
      entityType: "person",
      title: display,
      subtitle: `@${username}`,
      href: buildCreatorProfileHref({ username }),
      imageUrl: (row.avatar_url as string | null) ?? null,
      badge: "People",
      matchFields: [
        username,
        (row.display_name as string | null) ?? "",
        (row.full_name as string | null) ?? "",
      ],
      activityAt: (row.created_at as string | null) ?? null,
      qualityPrior: 0.7,
    });
  }
  return candidates;
}

async function searchVideos(
  supabase: AnyClient,
  term: string,
  limit: number
): Promise<RankableCandidate[]> {
  const pattern = quotedIlikePattern(term);
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, content, author_username, author_name, post_type, media_status, likes, created_at"
    )
    .eq("post_type", "video")
    .eq("media_status", "ready")
    .not("video_path", "is", null)
    .or(
      `content.ilike.${pattern},author_username.ilike.${pattern},author_name.ilike.${pattern}`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("searchVideos", error);
    return [];
  }

  return (data ?? [])
    .filter((row) =>
      isSearchableVideoRow({
        post_type: row.post_type as string,
        media_status: row.media_status as string,
        // Path presence already enforced by `.not("video_path", "is", null)`.
        video_path: "present",
      })
    )
    .map((row) => {
      const caption = ((row.content as string | null) ?? "").trim();
      const author = (row.author_username as string | null) ?? "";
      const likes = Number(row.likes ?? 0);
      return {
        id: String(row.id),
        entityType: "video" as const,
        title: caption || "Video",
        subtitle: author ? `@${author}` : (row.author_name as string | null),
        href: buildPostNotificationHref({ postId: row.id as number }),
        imageUrl: null,
        badge: "Video",
        matchFields: [
          caption,
          author,
          (row.author_name as string | null) ?? "",
        ],
        activityAt: (row.created_at as string | null) ?? null,
        qualityPrior: Math.min(1, 0.45 + Math.log10(Math.max(likes, 1)) / 6),
      };
    });
}

async function searchStories(
  supabase: AnyClient,
  term: string,
  limit: number,
  viewerId: string | null
): Promise<RankableCandidate[]> {
  if (!viewerId) return [];

  const nowIso = new Date().toISOString();
  const needle = term.toLowerCase();

  // RLS restricts to owner + followers. Never select media_path.
  const { data, error } = await supabase
    .from("stories")
    .select("id, owner_id, caption, created_at, expires_at")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 4, 24));

  if (error) {
    console.error("searchStories", error);
    return [];
  }

  const rows = (data ?? []).filter((row) => isSearchableStoryRow(row));
  if (rows.length === 0) return [];

  const ownerIds = [...new Set(rows.map((r) => r.owner_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, full_name, avatar_url")
    .in("id", ownerIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p] as const)
  );

  const candidates: RankableCandidate[] = [];
  for (const row of rows) {
    const profile = profileMap.get(row.owner_id as string);
    const username = (profile?.username as string | null) ?? "";
    const name =
      (profile?.display_name as string | null) ||
      (profile?.full_name as string | null) ||
      username ||
      "Story";
    const caption = ((row.caption as string | null) ?? "").trim();
    const matchFields = [caption, username, name];
    const haystack = matchFields.join(" ").toLowerCase();
    if (!haystack.includes(needle)) {
      continue;
    }
    candidates.push({
      id: String(row.id),
      entityType: "story",
      title: caption || `${name}'s story`,
      subtitle: username ? `@${username}` : name,
      href: username
        ? buildCreatorProfileHref({ username })
        : APP_ROUTES.discover,
      imageUrl: (profile?.avatar_url as string | null) ?? null,
      badge: "Story",
      matchFields,
      activityAt: (row.created_at as string | null) ?? null,
      qualityPrior: 0.55,
    });
    if (candidates.length >= limit) break;
  }
  return candidates;
}

async function searchStores(
  supabase: AnyClient,
  term: string,
  limit: number
): Promise<RankableCandidate[]> {
  const pattern = quotedIlikePattern(term);
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, status, verification_status, created_at")
    .eq("status", "active")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(limit);

  if (error) {
    console.error("searchStores", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => isSearchableStoreRow(row))
    .map((row) => {
      const verified = row.verification_status === "verified";
      return {
        id: String(row.id),
        entityType: "store" as const,
        title: (row.name as string) || "Store",
        subtitle: row.slug ? `@${row.slug}` : null,
        href: buildStoreShopIdHref(String(row.id)),
        imageUrl: null,
        badge: verified ? "Verified store" : "Store",
        matchFields: [
          (row.name as string) ?? "",
          (row.slug as string) ?? "",
        ],
        activityAt: (row.created_at as string | null) ?? null,
        qualityPrior: verified ? 0.95 : 0.55,
      };
    });
}

async function searchProducts(
  supabase: AnyClient,
  term: string,
  limit: number
): Promise<RankableCandidate[]> {
  const pattern = quotedIlikePattern(term);
  const { data, error } = await supabase
    .from("store_products")
    .select(
      `
      id, title, short_description, status, moderation_status, store_id, published_at, created_at,
      stores!inner ( id, status, name, slug )
    `
    )
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .eq("stores.status", "active")
    .or(`title.ilike.${pattern},short_description.ilike.${pattern}`)
    .limit(limit);

  if (error) {
    console.error("searchProducts", error);
    return [];
  }

  const candidates: RankableCandidate[] = [];
  for (const row of data ?? []) {
    const storeRaw = row.stores as unknown;
    const store = (Array.isArray(storeRaw) ? storeRaw[0] : storeRaw) as {
      id: string;
      status: string;
      name: string | null;
      slug: string | null;
    } | null;
    const storeStatus = store?.status ?? null;
    const storeName = store?.name ?? null;
    if (
      !isSearchableProductRow({
        status: row.status as string,
        moderation_status: row.moderation_status as string,
        store_status: storeStatus,
      })
    ) {
      continue;
    }
    const title = (row.title as string) || "Product";
    const desc = ((row.short_description as string | null) ?? "").trim();
    candidates.push({
      id: String(row.id),
      entityType: "product",
      title,
      subtitle: storeName || desc || null,
      href: buildStoreProductIdHref(String(row.id)),
      imageUrl: null,
      badge: "Product",
      matchFields: [title, desc, storeName ?? ""],
      activityAt:
        (row.published_at as string | null) ??
        (row.created_at as string | null) ??
        null,
      qualityPrior: 0.7,
    });
  }
  return candidates;
}

export type RunGlobalSearchInput = {
  query: string;
  tab?: SearchTab;
  limit?: number;
  viewerId?: string | null;
};

export type RunGlobalSearchResult =
  | { ok: true; result: GlobalSearchResult }
  | { ok: false; message: string };

export async function runGlobalSearch(
  supabase: AnyClient,
  input: RunGlobalSearchInput
): Promise<RunGlobalSearchResult> {
  const validated = validateSearchQuery(input.query);
  if (!validated.ok) {
    if (validated.empty) {
      return {
        ok: true,
        result: {
          query: "",
          tab: input.tab ?? "all",
          groups: groupResultsByTab([]),
          items: [],
          totalCount: 0,
        },
      };
    }
    return { ok: false, message: validated.message };
  }

  const tab = input.tab ?? "all";
  const limit = clampSearchLimit(input.limit);
  const perTypeLimit = tab === "all" ? Math.max(6, Math.floor(limit / 2)) : limit;
  const term = validated.normalized;
  const viewerId = input.viewerId ?? null;

  try {
    const tasks: Promise<RankableCandidate[]>[] = [];
    if (tab === "all" || tab === "people") {
      tasks.push(searchPeople(supabase, term, perTypeLimit));
    } else {
      tasks.push(Promise.resolve([]));
    }
    if (tab === "all" || tab === "videos") {
      tasks.push(searchVideos(supabase, term, perTypeLimit));
    } else {
      tasks.push(Promise.resolve([]));
    }
    if (tab === "all" || tab === "stories") {
      tasks.push(searchStories(supabase, term, perTypeLimit, viewerId));
    } else {
      tasks.push(Promise.resolve([]));
    }
    if (tab === "all" || tab === "stores") {
      tasks.push(searchStores(supabase, term, perTypeLimit));
    } else {
      tasks.push(Promise.resolve([]));
    }
    if (tab === "all" || tab === "products") {
      tasks.push(searchProducts(supabase, term, perTypeLimit));
    } else {
      tasks.push(Promise.resolve([]));
    }

    const [people, videos, stories, stores, products] = await Promise.all(tasks);
    const candidates = [
      ...people,
      ...videos,
      ...stories,
      ...stores,
      ...products,
    ];
    const ranked = rankCandidates(term, candidates);
    const items = filterResultsByTab(ranked, tab).slice(0, limit);
    const groups = groupResultsByTab(ranked).map((g) => ({
      ...g,
      items: g.items.slice(0, perTypeLimit),
    }));

    return {
      ok: true,
      result: {
        query: validated.query,
        tab,
        groups,
        items,
        totalCount: items.length,
      },
    };
  } catch (error) {
    console.error("runGlobalSearch", error);
    return {
      ok: false,
      message: searchUserMessage(
        error instanceof Error ? error.message : null,
        SEARCH_ERRORS.loadFailed
      ),
    };
  }
}

export async function listRecentSearches(
  supabase: AnyClient,
  userId: string,
  limit = 12
): Promise<{ ok: true; items: RecentSearchItem[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("search_recent_queries")
    .select("id, query_text, result_tab, last_searched_at")
    .eq("user_id", userId)
    .order("last_searched_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 30));

  if (error) {
    console.error("listRecentSearches", error);
    return { ok: false, message: SEARCH_ERRORS.recentFailed };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => ({
      id: String(row.id),
      query: String(row.query_text),
      tab: (row.result_tab as SearchTab) || "all",
      lastSearchedAt: String(row.last_searched_at),
    })),
  };
}

export async function rememberRecentSearch(
  supabase: AnyClient,
  userId: string,
  query: string,
  tab: SearchTab
): Promise<void> {
  const validated = validateSearchQuery(query);
  if (!validated.ok) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from("search_recent_queries").upsert(
    {
      user_id: userId,
      query_text: validated.query,
      query_normalized: validated.normalized,
      result_tab: tab,
      last_searched_at: now,
    },
    { onConflict: "user_id,query_normalized" }
  );

  if (error) {
    console.error("rememberRecentSearch", error);
  }
}

export async function clearRecentSearches(
  supabase: AnyClient,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from("search_recent_queries")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("clearRecentSearches", error);
    return { ok: false, message: SEARCH_ERRORS.clearFailed };
  }
  return { ok: true };
}
