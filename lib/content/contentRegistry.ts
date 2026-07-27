/**
 * Unified Content Foundation V1 — shared types & registry helpers.
 * Domains remain authoritative; this is a thin index only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTENT_KINDS = ["article", "video"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_VISIBILITIES = ["public", "unlisted", "private"] as const;
export type ContentVisibility = (typeof CONTENT_VISIBILITIES)[number];

export const CONTENT_PUBLISH_STATES = [
  "draft",
  "published",
  "unpublished",
] as const;
export type ContentPublishState = (typeof CONTENT_PUBLISH_STATES)[number];

export const CONTENT_REGISTRY_RPCS = {
  upsert: "upsert_content_registry_item",
  deactivate: "deactivate_content_registry_item",
  setDiscoveryPost: "set_content_registry_discovery_post",
  backfill: "backfill_content_registry_v1",
} as const;

export type ContentRegistryRow = {
  id: string;
  content_kind: ContentKind;
  source_entity_id: string;
  owner_user_id: string;
  visibility: ContentVisibility;
  publish_state: ContentPublishState;
  canonical_href: string;
  discovery_post_id: number | null;
  title: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileContentCard = {
  registryId: string;
  kind: ContentKind;
  sourceEntityId: string;
  title: string;
  href: string;
  publishedAt: string | null;
  discoveryPostId: number | null;
};

export type ContentAdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type ContentAdapter = {
  kind: ContentKind;
  register: (
    supabase: SupabaseClient,
    sourceEntityId: string
  ) => Promise<ContentAdapterResult<ContentRegistryRow>>;
  sync: (
    supabase: SupabaseClient,
    sourceEntityId: string
  ) => Promise<ContentAdapterResult<ContentRegistryRow>>;
  resolveProfileCard: (row: ContentRegistryRow) => ProfileContentCard;
  resolveCanonicalHref: (sourceEntityId: string) => string;
  resolveDiscoveryPost: (
    supabase: SupabaseClient,
    sourceEntityId: string
  ) => Promise<number | null>;
  resolveVisibility: (input: {
    publishState: ContentPublishState;
  }) => ContentVisibility;
  unpublish: (
    supabase: SupabaseClient,
    sourceEntityId: string
  ) => Promise<ContentAdapterResult<{ found: boolean }>>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isContentKind(value: string): value is ContentKind {
  return (CONTENT_KINDS as readonly string[]).includes(value);
}

export function sourceEntityIdFromUuid(id: string): string {
  return id.trim();
}

export function sourceEntityIdFromPostId(postId: number): string {
  return String(postId);
}

export function parsePostIdFromSource(sourceEntityId: string): number | null {
  const n = Number(sourceEntityId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function mapContentRegistryRow(
  raw: Record<string, unknown>
): ContentRegistryRow | null {
  const id = asString(raw.id);
  const kind = asString(raw.content_kind);
  const source = asString(raw.source_entity_id);
  const owner = asString(raw.owner_user_id);
  const href = asString(raw.canonical_href);
  if (!id || !kind || !isContentKind(kind) || !source || !owner || !href) {
    return null;
  }
  return {
    id,
    content_kind: kind,
    source_entity_id: source,
    owner_user_id: owner,
    visibility: (asString(raw.visibility) as ContentVisibility) || "public",
    publish_state:
      (asString(raw.publish_state) as ContentPublishState) || "draft",
    canonical_href: href,
    discovery_post_id:
      raw.discovery_post_id == null ? null : Number(raw.discovery_post_id),
    title: asString(raw.title) ?? "",
    published_at: asString(raw.published_at),
    created_at: asString(raw.created_at) ?? "",
    updated_at: asString(raw.updated_at) ?? "",
  };
}

export async function upsertContentRegistryItem(
  supabase: SupabaseClient,
  input: {
    contentKind: ContentKind;
    sourceEntityId: string;
    ownerUserId: string;
    visibility: ContentVisibility;
    publishState: ContentPublishState;
    canonicalHref: string;
    discoveryPostId?: number | null;
    title?: string;
    publishedAt?: string | null;
  }
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  const { data, error } = await supabase.rpc(CONTENT_REGISTRY_RPCS.upsert, {
    p_content_kind: input.contentKind,
    p_source_entity_id: input.sourceEntityId,
    p_owner_user_id: input.ownerUserId,
    p_visibility: input.visibility,
    p_publish_state: input.publishState,
    p_canonical_href: input.canonicalHref,
    p_discovery_post_id: input.discoveryPostId ?? null,
    p_title: input.title ?? "",
    p_published_at: input.publishedAt ?? null,
  });
  if (error) {
    return { ok: false, message: "Unable to sync content registry." };
  }
  const payload = asRecord(data);
  if (!payload) return { ok: false, message: "Registry payload malformed." };

  // Re-read full row for adapters
  const { data: row, error: readError } = await supabase
    .from("content_registry")
    .select(
      "id, content_kind, source_entity_id, owner_user_id, visibility, publish_state, canonical_href, discovery_post_id, title, published_at, created_at, updated_at"
    )
    .eq("content_kind", input.contentKind)
    .eq("source_entity_id", input.sourceEntityId)
    .maybeSingle();
  if (readError || !row) {
    return { ok: false, message: "Registry item not readable after upsert." };
  }
  const mapped = mapContentRegistryRow(row as Record<string, unknown>);
  if (!mapped) return { ok: false, message: "Registry row malformed." };
  return { ok: true, data: mapped };
}

export async function deactivateContentRegistryItem(
  supabase: SupabaseClient,
  contentKind: ContentKind,
  sourceEntityId: string
): Promise<ContentAdapterResult<{ found: boolean }>> {
  const { data, error } = await supabase.rpc(CONTENT_REGISTRY_RPCS.deactivate, {
    p_content_kind: contentKind,
    p_source_entity_id: sourceEntityId,
  });
  if (error) {
    return { ok: false, message: "Unable to deactivate content registry item." };
  }
  const row = asRecord(data);
  return { ok: true, data: { found: Boolean(row?.found) } };
}

export async function setContentRegistryDiscoveryPost(
  supabase: SupabaseClient,
  contentKind: ContentKind,
  sourceEntityId: string,
  discoveryPostId: number
): Promise<ContentAdapterResult<{ discoveryPostId: number }>> {
  const { data, error } = await supabase.rpc(
    CONTENT_REGISTRY_RPCS.setDiscoveryPost,
    {
      p_content_kind: contentKind,
      p_source_entity_id: sourceEntityId,
      p_discovery_post_id: discoveryPostId,
    }
  );
  if (error) {
    return { ok: false, message: "Unable to link discovery post." };
  }
  const row = asRecord(data);
  const id =
    row?.discovery_post_id == null ? null : Number(row.discovery_post_id);
  if (id == null || !Number.isFinite(id)) {
    return { ok: false, message: "Discovery post link malformed." };
  }
  return { ok: true, data: { discoveryPostId: id } };
}

/**
 * Profile All list — chronological published items for a profile owner.
 * Visitor sessions only see public+published (enforced by RLS).
 */
export async function listProfileContentRegistry(
  supabase: SupabaseClient,
  ownerUserId: string,
  options?: { limit?: number }
): Promise<{ items: ProfileContentCard[]; failed: boolean }> {
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);
  const { data, error } = await supabase
    .from("content_registry")
    .select(
      "id, content_kind, source_entity_id, owner_user_id, visibility, publish_state, canonical_href, discovery_post_id, title, published_at, created_at, updated_at"
    )
    .eq("owner_user_id", ownerUserId)
    .eq("publish_state", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table may not exist yet pre-migration — fail soft for profile.
    console.error("listProfileContentRegistry", error);
    return { items: [], failed: true };
  }

  const items: ProfileContentCard[] = [];
  for (const raw of data ?? []) {
    const row = mapContentRegistryRow(raw as Record<string, unknown>);
    if (!row) continue;
    // Dedup safety: never list kind=video when it is only a teaser of an article
    // (independent videos only are registered as video).
    items.push({
      registryId: row.id,
      kind: row.content_kind,
      sourceEntityId: row.source_entity_id,
      title: row.title || (row.content_kind === "article" ? "Article" : "Video"),
      href: row.canonical_href,
      publishedAt: row.published_at,
      discoveryPostId: row.discovery_post_id,
    });
  }
  return { items, failed: false };
}

/** Pure helper: independent video posts are those without article_id. */
export function isIndependentVideoPost(post: {
  article_id?: string | null;
}): boolean {
  return post.article_id == null || String(post.article_id).trim() === "";
}
