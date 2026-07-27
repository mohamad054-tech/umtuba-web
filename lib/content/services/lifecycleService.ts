/**
 * Content Lifecycle Service — orchestrates registry sync after domain validation.
 * Does not mutate domain tables; adapters validate source first.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deactivateContentRegistryItem,
  isContentKind,
  mapContentRegistryRow,
  upsertContentRegistryItem,
  type ContentAdapterResult,
  type ContentKind,
  type ContentPublishState,
  type ContentRegistryRow,
  type ContentVisibility,
} from "../contentRegistry";
import { assertTrustedCanonicalHref } from "./canonicalLinkService";
import { resolveReadyDiscoveryPostId } from "./discoveryBindingService";
import { emitContentHook } from "./hookContracts";
import {
  isPublicListingEligible,
  normalizeVisibility,
} from "./visibilityService";

export type LifecycleSyncInput = {
  contentKind: ContentKind;
  sourceEntityId: string;
  ownerUserId: string;
  publishState: ContentPublishState;
  visibilityHint?: string | null;
  title: string;
  publishedAt?: string | null;
  discoveryPostId?: number | null;
  /** Must already be produced by Canonical Link Service. */
  canonicalHref: string;
};

export async function syncContentLifecycle(
  supabase: SupabaseClient,
  input: LifecycleSyncInput
): Promise<ContentAdapterResult<ContentRegistryRow>> {
  if (!isContentKind(input.contentKind)) {
    return { ok: false, message: "Unsupported content kind." };
  }

  const hrefCheck = assertTrustedCanonicalHref(input.canonicalHref);
  if (!hrefCheck.ok) return hrefCheck;

  const visibility = normalizeVisibility(
    input.visibilityHint ??
      (input.publishState === "published" ? "public" : "private")
  );

  if (
    input.publishState !== "published" &&
    isPublicListingEligible({
      visibility,
      publishState: input.publishState,
    })
  ) {
    return { ok: false, message: "Unknown publish state for listing." };
  }

  let discoveryPostId: number | null = null;
  if (input.discoveryPostId != null) {
    discoveryPostId = await resolveReadyDiscoveryPostId(supabase, {
      contentKind: input.contentKind,
      sourceEntityId: input.sourceEntityId,
      ownerUserId: input.ownerUserId,
      candidatePostId: input.discoveryPostId,
    });
  }

  const previous = await readRegistryRow(
    supabase,
    input.contentKind,
    input.sourceEntityId
  );

  const upserted = await upsertContentRegistryItem(supabase, {
    contentKind: input.contentKind,
    sourceEntityId: input.sourceEntityId,
    ownerUserId: input.ownerUserId,
    visibility,
    publishState: input.publishState,
    canonicalHref: hrefCheck.href,
    discoveryPostId,
    title: input.title.slice(0, 300),
    publishedAt: input.publishedAt ?? null,
  });

  if (!upserted.ok) return upserted;

  emitLifecycleHooks({
    previous,
    next: upserted.data,
  });

  return upserted;
}

export async function deactivateContentLifecycle(
  supabase: SupabaseClient,
  contentKind: ContentKind,
  sourceEntityId: string,
  ownerUserId?: string | null
): Promise<ContentAdapterResult<{ found: boolean }>> {
  if (!isContentKind(contentKind)) {
    return { ok: false, message: "Unsupported content kind." };
  }

  const previous = await readRegistryRow(supabase, contentKind, sourceEntityId);
  if (
    previous &&
    ownerUserId &&
    previous.owner_user_id !== ownerUserId
  ) {
    return { ok: false, message: "Owner mismatch." };
  }

  const result = await deactivateContentRegistryItem(
    supabase,
    contentKind,
    sourceEntityId
  );
  if (result.ok && previous) {
    emitContentHook({
      type: "onContentUnpublished",
      contentKind,
      sourceEntityId,
      ownerUserId: previous.owner_user_id,
      registryId: previous.id,
      at: new Date().toISOString(),
    });
    emitContentHook({
      type: "onContentDeleted",
      contentKind,
      sourceEntityId,
      ownerUserId: previous.owner_user_id,
      at: new Date().toISOString(),
    });
  }
  return result;
}

async function readRegistryRow(
  supabase: SupabaseClient,
  contentKind: ContentKind,
  sourceEntityId: string
): Promise<ContentRegistryRow | null> {
  const { data, error } = await supabase
    .from("content_registry")
    .select(
      "id, content_kind, source_entity_id, owner_user_id, visibility, publish_state, canonical_href, discovery_post_id, title, published_at, created_at, updated_at"
    )
    .eq("content_kind", contentKind)
    .eq("source_entity_id", sourceEntityId)
    .maybeSingle();
  if (error || !data) return null;
  return mapContentRegistryRow(data as Record<string, unknown>);
}

function emitLifecycleHooks(input: {
  previous: ContentRegistryRow | null;
  next: ContentRegistryRow;
}): void {
  const { previous, next } = input;
  const at = new Date().toISOString();

  if (next.publish_state === "published") {
    const wasPublished = previous?.publish_state === "published";
    if (!wasPublished) {
      emitContentHook({
        type: "onContentPublished",
        contentKind: next.content_kind,
        sourceEntityId: next.source_entity_id,
        ownerUserId: next.owner_user_id,
        registryId: next.id,
        at,
      });
    }
  } else if (previous?.publish_state === "published") {
    emitContentHook({
      type: "onContentUnpublished",
      contentKind: next.content_kind,
      sourceEntityId: next.source_entity_id,
      ownerUserId: next.owner_user_id,
      registryId: next.id,
      at,
    });
  }

  if (previous && previous.visibility !== next.visibility) {
    emitContentHook({
      type: "onVisibilityChanged",
      contentKind: next.content_kind,
      sourceEntityId: next.source_entity_id,
      ownerUserId: next.owner_user_id,
      visibility: next.visibility as ContentVisibility,
      at,
    });
  }

  if (
    next.discovery_post_id != null &&
    previous?.discovery_post_id !== next.discovery_post_id
  ) {
    emitContentHook({
      type: "onDiscoveryReady",
      contentKind: next.content_kind,
      sourceEntityId: next.source_entity_id,
      ownerUserId: next.owner_user_id,
      discoveryPostId: next.discovery_post_id,
      at,
    });
  }
}
