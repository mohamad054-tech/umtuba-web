/**
 * Article adapter — uses Content Services V2.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isArticleUuid } from "../../articles/articlesFoundation";
import {
  sourceEntityIdFromUuid,
  type ContentAdapterResult,
  type ContentRegistryRow,
  type ProfileContentCard,
} from "../contentRegistry";
import type { DomainContentAdapter } from "../runtime/adapterRuntime";
import { buildCanonicalHref } from "../services/canonicalLinkService";
import { bindDiscoveryPost } from "../services/discoveryBindingService";
import {
  deactivateContentLifecycle,
  syncContentLifecycle,
} from "../services/lifecycleService";
import { visibilityFromPublishState } from "../services/visibilityService";

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
  if (!isArticleUuid(articleId)) return null;
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

async function validateArticleSource(
  supabase: SupabaseClient,
  sourceEntityId: string
) {
  const article = await loadArticle(supabase, sourceEntityId);
  if (!article) {
    return { ok: false as const, message: "Article not found." };
  }
  const published = article.status === "published";
  const discoveryPostId = await findDiscoveryPostId(supabase, article.id);
  return {
    ok: true as const,
    data: {
      ownerUserId: article.user_id,
      publishState: published
        ? ("published" as const)
        : ("unpublished" as const),
      visibilityHint: published ? "public" : "private",
      title: article.title,
      publishedAt: article.published_at,
      discoveryPostId,
    },
  };
}

async function syncArticle(
  supabase: SupabaseClient,
  sourceEntityId: string
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  const validated = await validateArticleSource(supabase, sourceEntityId);
  if (!validated.ok) return validated;

  const href = buildCanonicalHref("article", sourceEntityId);
  if (!href.ok) return href;

  return syncContentLifecycle(supabase, {
    contentKind: "article",
    sourceEntityId: sourceEntityIdFromUuid(sourceEntityId),
    ownerUserId: validated.data.ownerUserId,
    publishState: validated.data.publishState,
    visibilityHint: validated.data.visibilityHint,
    title: validated.data.title,
    publishedAt: validated.data.publishedAt,
    discoveryPostId: validated.data.discoveryPostId,
    canonicalHref: href.href,
  });
}

export const articleContentAdapter: DomainContentAdapter = {
  kind: "article",
  validateSource: validateArticleSource,
  resolveOwner: (snapshot) => snapshot.ownerUserId,
  resolvePublishState: (snapshot) => snapshot.publishState,
  resolveVisibilityHint: (snapshot) => snapshot.visibilityHint,
  register: syncArticle,
  sync: syncArticle,
  resolveProfileCard(row): ProfileContentCard {
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
    const href = buildCanonicalHref("article", sourceEntityId);
    return href.ok ? href.href : "/articles/invalid";
  },
  resolveDiscoveryPost: findDiscoveryPostId,
  resolveVisibility({ publishState }) {
    return visibilityFromPublishState(publishState);
  },
  async unpublish(supabase, sourceEntityId) {
    const article = await loadArticle(supabase, sourceEntityId);
    return deactivateContentLifecycle(
      supabase,
      "article",
      sourceEntityId,
      article?.user_id ?? null
    );
  },
};

export async function syncArticleDiscoveryPost(
  supabase: SupabaseClient,
  articleId: string,
  discoveryPostId: number
): Promise<ContentAdapterResult<{ discoveryPostId: number }>> {
  const synced = await articleContentAdapter.sync(supabase, articleId);
  if (!synced.ok) return synced;
  return bindDiscoveryPost(supabase, {
    contentKind: "article",
    sourceEntityId: sourceEntityIdFromUuid(articleId),
    ownerUserId: synced.data.owner_user_id,
    discoveryPostId,
  });
}
