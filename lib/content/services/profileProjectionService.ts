/**
 * Profile Projection Service — unified Profile All cards from registry.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapContentRegistryRow,
  type ContentKind,
  type ProfileContentCard,
} from "../contentRegistry";
import { canViewerAccessContent } from "./visibilityService";
import { getRegisteredAdapter } from "../runtime/adapterRuntime";
import { ensureBuiltinContentAdaptersRegistered } from "../runtime/registerBuiltinAdapters";

// Ensure allowlisted adapters exist before projection.
ensureBuiltinContentAdaptersRegistered();

export type ProfileProjectionCard = ProfileContentCard & {
  ownerUserId: string;
  contentKind: ContentKind;
  summary?: string | null;
  visibility: string;
  publishState: string;
  presentationVariant: "article" | "video";
  badges: Array<"linked_article" | "generated_teaser" | "independent_video">;
};

export type ProfileProjectionPage = {
  items: ProfileProjectionCard[];
  failed: boolean;
  nextCursor: string | null;
};

function encodeCursor(input: {
  publishedAt: string | null;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      p: input.publishedAt,
      i: input.id,
    }),
    "utf8"
  ).toString("base64url");
}

function decodeCursor(
  cursor: string | null | undefined
): { publishedAt: string | null; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as { p?: string | null; i?: string };
    if (!raw.i) return null;
    return { publishedAt: raw.p ?? null, id: raw.i };
  } catch {
    return null;
  }
}

export function projectRegistryRowToCard(row: {
  id: string;
  content_kind: ContentKind;
  source_entity_id: string;
  owner_user_id: string;
  title: string;
  canonical_href: string;
  published_at: string | null;
  discovery_post_id: number | null;
  visibility: string;
  publish_state: string;
}): ProfileProjectionCard {
  const adapter = getRegisteredAdapter(row.content_kind);
  const base: ProfileContentCard = adapter
    ? adapter.resolveProfileCard({
        id: row.id,
        content_kind: row.content_kind,
        source_entity_id: row.source_entity_id,
        owner_user_id: row.owner_user_id,
        visibility: row.visibility as never,
        publish_state: row.publish_state as never,
        canonical_href: row.canonical_href,
        discovery_post_id: row.discovery_post_id,
        title: row.title,
        published_at: row.published_at,
        created_at: "",
        updated_at: "",
      })
    : {
        registryId: row.id,
        kind: row.content_kind,
        sourceEntityId: row.source_entity_id,
        title: row.title,
        href: row.canonical_href,
        publishedAt: row.published_at,
        discoveryPostId: row.discovery_post_id,
      };

  const badges: ProfileProjectionCard["badges"] = [];
  if (row.content_kind === "article" && row.discovery_post_id != null) {
    badges.push("linked_article");
  }
  if (row.content_kind === "video") {
    badges.push("independent_video");
  }

  return {
    ...base,
    ownerUserId: row.owner_user_id,
    contentKind: row.content_kind,
    summary: null,
    visibility: row.visibility,
    publishState: row.publish_state,
    presentationVariant: row.content_kind === "article" ? "article" : "video",
    badges,
  };
}

/**
 * Stable chronological projection for Profile All.
 * Soft-fails when registry table is missing (pre-migration).
 */
export async function listProfileProjections(
  supabase: SupabaseClient,
  ownerUserId: string,
  options?: {
    limit?: number;
    cursor?: string | null;
    viewerId?: string | null;
  }
): Promise<ProfileProjectionPage> {
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);
  const cursor = decodeCursor(options?.cursor ?? null);

  let query = supabase
    .from("content_registry")
    .select(
      "id, content_kind, source_entity_id, owner_user_id, visibility, publish_state, canonical_href, discovery_post_id, title, published_at, created_at, updated_at"
    )
    .eq("owner_user_id", ownerUserId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  // Owner sees all own rows via RLS; visitors only public+published via RLS.
  // Extra client filter for clarity when viewer is not owner.
  if (!options?.viewerId || options.viewerId !== ownerUserId) {
    query = query.eq("publish_state", "published").eq("visibility", "public");
  }

  const { data, error } = await query;
  if (error) {
    console.error("listProfileProjections", error);
    return { items: [], failed: true, nextCursor: null };
  }

  const rows = (data ?? [])
    .map((raw) => mapContentRegistryRow(raw as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => row != null);

  // Cursor filter in memory (stable tie-break published_at + id).
  let filtered = rows;
  if (cursor) {
    filtered = rows.filter((row) => {
      const pub = row.published_at;
      if (cursor.publishedAt == null) {
        return row.id < cursor.id;
      }
      if (pub == null) return true;
      if (pub < cursor.publishedAt) return true;
      if (pub > cursor.publishedAt) return false;
      return row.id < cursor.id;
    });
  }

  const pageRows = filtered.slice(0, limit);
  const items: ProfileProjectionCard[] = [];

  for (const row of pageRows) {
    if (
      !canViewerAccessContent({
        visibility: row.visibility,
        publishState: row.publish_state,
        ownerUserId: row.owner_user_id,
        viewerId: options?.viewerId ?? null,
      })
    ) {
      continue;
    }
    try {
      items.push(projectRegistryRowToCard(row));
    } catch (error) {
      console.error("profile projection skip", row.id, error);
    }
  }

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    filtered.length > limit && last
      ? encodeCursor({ publishedAt: last.published_at, id: last.id })
      : null;

  return { items, failed: false, nextCursor };
}

/** Compatibility wrapper matching V1 ProfileContentCard list shape. */
export async function listProfileContentCards(
  supabase: SupabaseClient,
  ownerUserId: string,
  options?: { limit?: number; viewerId?: string | null }
): Promise<{ items: ProfileContentCard[]; failed: boolean }> {
  const page = await listProfileProjections(supabase, ownerUserId, options);
  return {
    items: page.items.map((item) => ({
      registryId: item.registryId,
      kind: item.kind,
      sourceEntityId: item.sourceEntityId,
      title: item.title,
      href: item.href,
      publishedAt: item.publishedAt,
      discoveryPostId: item.discoveryPostId,
    })),
    failed: page.failed,
  };
}
