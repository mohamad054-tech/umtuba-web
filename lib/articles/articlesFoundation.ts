/**
 * Articles + Article Teaser foundation (Page Assembly V1).
 * DB: supabase/migrations/20260865_articles_teaser_foundation_v1.sql
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const ARTICLE_RPCS = {
  publish: "publish_my_article",
} as const;

export type ArticleRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ArticleListItem = {
  id: string;
  title: string;
  publishedAt: string | null;
  excerpt: string;
  href: string;
};

export type ArticleResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isArticleUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function excerptFromBody(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export function sanitizeArticleError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Article could not be processed.";
  const lower = raw.toLowerCase();
  if (lower.includes("authentication required")) {
    return "Please sign in to continue.";
  }
  if (lower.includes("teaser")) {
    return "Teaser video is missing or not ready.";
  }
  if (raw.length > 180) return "Article could not be processed.";
  return raw;
}

export async function publishMyArticle(
  supabase: AnyClient,
  input: {
    title: string;
    body: string;
    teaserPostId?: number | null;
  }
): Promise<ArticleResult<{ articleId: string; title: string }>> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 200) {
    return { ok: false, message: "Title must be 1–200 characters." };
  }
  if (!body || body.length > 50000) {
    return { ok: false, message: "Body must be 1–50000 characters." };
  }

  const { data, error } = await supabase.rpc(ARTICLE_RPCS.publish, {
    p_title: title,
    p_body: body,
    p_teaser_post_id: input.teaserPostId ?? null,
  });
  if (error) {
    return { ok: false, message: sanitizeArticleError(error.message) };
  }
  const row = asRecord(data);
  const articleId = asString(row?.article_id);
  if (!articleId) {
    return { ok: false, message: "Article payload is malformed." };
  }
  return {
    ok: true,
    data: { articleId, title: asString(row?.title) ?? title },
  };
}

export async function getPublishedArticle(
  supabase: AnyClient,
  articleId: string
): Promise<ArticleResult<ArticleRow & { authorUsername: string | null }>> {
  if (!isArticleUuid(articleId)) {
    return { ok: false, message: "Article not found." };
  }
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, user_id, title, body, status, published_at, created_at, updated_at"
    )
    .eq("id", articleId)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("getPublishedArticle", error);
    return { ok: false, message: "Unable to load this article." };
  }
  if (!data) {
    return { ok: false, message: "Article not found." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user_id)
    .maybeSingle();
  return {
    ok: true,
    data: {
      ...(data as ArticleRow),
      authorUsername:
        typeof profile?.username === "string" ? profile.username : null,
    },
  };
}

export async function listPublishedArticlesForUser(
  supabase: AnyClient,
  userId: string,
  options?: { limit?: number }
): Promise<{ items: ArticleListItem[]; failed: boolean }> {
  if (!isArticleUuid(userId)) {
    return { items: [], failed: false };
  }
  const limit = Math.min(Math.max(options?.limit ?? 24, 1), 60);
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, body, published_at")
    .eq("user_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listPublishedArticlesForUser", error);
    return { items: [], failed: true };
  }
  const items: ArticleListItem[] = (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled"),
    publishedAt:
      typeof row.published_at === "string" ? row.published_at : null,
    excerpt: excerptFromBody(String(row.body ?? "")),
    href: `/articles/${row.id}`,
  }));
  return { items, failed: false };
}

export async function listArticleTitlesByIds(
  supabase: AnyClient,
  articleIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(articleIds.filter(isArticleUuid))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from("articles")
    .select("id, title")
    .in("id", unique)
    .eq("status", "published");
  if (error) {
    console.error("listArticleTitlesByIds", error);
    return map;
  }
  for (const row of data ?? []) {
    if (row.id && row.title) map.set(String(row.id), String(row.title));
  }
  return map;
}

/** Owner's ready video posts eligible as teasers (no article yet). */
export async function listEligibleTeaserVideos(
  supabase: AnyClient,
  userId: string
): Promise<Array<{ id: number; caption: string }>> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, article_id")
    .eq("user_id", userId)
    .eq("post_type", "video")
    .eq("media_status", "ready")
    .not("video_path", "is", null)
    .is("article_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("listEligibleTeaserVideos", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    caption: String(row.content ?? "Untitled video"),
  }));
}
