/**
 * Article adapter — Unified Content Foundation V1.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildArticleHref } from "../../../app/lib/nav/routes";
import {
  deactivateContentRegistryItem,
  setContentRegistryDiscoveryPost,
  sourceEntityIdFromUuid,
  upsertContentRegistryItem,
  type ContentAdapter,
  type ContentAdapterResult,
  type ContentRegistryRow,
  type ProfileContentCard,
} from "../contentRegistry";

async function loadArticle(
  supabase: SupabaseClient,
  articleId: string
): Promise<{
  id: string;
  user_id: string;
  title: string;
  status: string;
  published_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, user_id, title, status, published_at")
    .eq("id", articleId)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    user_id: string;
    title: string;
    status: string;
    published_at: string | null;
  };
}

async function findDiscoveryPostId(
  supabase: SupabaseClient,
  articleId: string
): Promise<number | null> {
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("article_id", articleId)
    .eq("post_type", "video")
    .eq("media_status", "ready")
    .not("video_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id != null ? Number(data.id) : null;
}

async function syncArticle(
  supabase: SupabaseClient,
  sourceEntityId: string
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  const article = await loadArticle(supabase, sourceEntityId);
  if (!article) {
    return { ok: false, message: "Article not found." };
  }

  const published = article.status === "published";
  const discoveryPostId = await findDiscoveryPostId(supabase, article.id);

  return upsertContentRegistryItem(supabase, {
    contentKind: "article",
    sourceEntityId: sourceEntityIdFromUuid(article.id),
    ownerUserId: article.user_id,
    visibility: published ? "public" : "private",
    publishState: published ? "published" : "unpublished",
    canonicalHref: buildArticleHref(article.id),
    discoveryPostId,
    title: article.title,
    publishedAt: article.published_at,
  });
}

export const articleContentAdapter: ContentAdapter = {
  kind: "article",

  register: syncArticle,
  sync: syncArticle,

  resolveProfileCard(row: ContentRegistryRow): ProfileContentCard {
    return {
      registryId: row.id,
      kind: "article",
      sourceEntityId: row.source_entity_id,
      title: row.title || "Article",
      href: row.canonical_href,
      publishedAt: row.published_at,
      discoveryPostId: row.discovery_post_id,
    };
  },

  resolveCanonicalHref(sourceEntityId: string): string {
    return buildArticleHref(sourceEntityId);
  },

  resolveDiscoveryPost: findDiscoveryPostId,

  resolveVisibility({ publishState }) {
    return publishState === "published" ? "public" : "private";
  },

  async unpublish(supabase, sourceEntityId) {
    return deactivateContentRegistryItem(supabase, "article", sourceEntityId);
  },
};

export async function syncArticleDiscoveryPost(
  supabase: SupabaseClient,
  articleId: string,
  discoveryPostId: number
): Promise<ContentAdapterResult<{ discoveryPostId: number }>> {
  // Ensure registry row exists, then set discovery link.
  const synced = await articleContentAdapter.sync(supabase, articleId);
  if (!synced.ok) return synced;
  return setContentRegistryDiscoveryPost(
    supabase,
    "article",
    sourceEntityIdFromUuid(articleId),
    discoveryPostId
  );
}
