/**
 * Adapter Runtime — allowlisted server-side adapter registry.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentAdapter,
  ContentAdapterResult,
  ContentKind,
  ContentPublishState,
  ContentRegistryRow,
  ContentVisibility,
  ProfileContentCard,
} from "../contentRegistry";

export type DomainSourceSnapshot = {
  ownerUserId: string;
  publishState: ContentPublishState;
  visibilityHint: string;
  title: string;
  publishedAt: string | null;
  discoveryPostId: number | null;
};

export type DomainContentAdapter = ContentAdapter & {
  validateSource: (
    supabase: SupabaseClient,
    sourceEntityId: string
  ) => Promise<ContentAdapterResult<DomainSourceSnapshot>>;
  resolveOwner: (snapshot: DomainSourceSnapshot) => string;
  resolvePublishState: (
    snapshot: DomainSourceSnapshot
  ) => ContentPublishState;
  resolveVisibilityHint: (snapshot: DomainSourceSnapshot) => string;
};

const adapters = new Map<ContentKind, DomainContentAdapter>();

export function registerContentAdapter(adapter: DomainContentAdapter): void {
  if (adapters.has(adapter.kind)) {
    throw new Error(`Duplicate content adapter for kind: ${adapter.kind}`);
  }
  adapters.set(adapter.kind, adapter);
}

export function getRegisteredAdapter(
  kind: ContentKind | string
): DomainContentAdapter | null {
  if (kind !== "article" && kind !== "video") return null;
  return adapters.get(kind) ?? null;
}

export function listRegisteredContentKinds(): ContentKind[] {
  return [...adapters.keys()];
}

export function requireContentAdapter(
  kind: string
): ContentAdapterResult<DomainContentAdapter> {
  const adapter = getRegisteredAdapter(kind);
  if (!adapter) {
    return { ok: false, message: "Unsupported content kind." };
  }
  return { ok: true, data: adapter };
}

/** Resolve profile card via registered adapter only. */
export function resolveAdapterProfileCard(
  kind: ContentKind,
  row: ContentRegistryRow
): ProfileContentCard | null {
  const adapter = getRegisteredAdapter(kind);
  if (!adapter) return null;
  return adapter.resolveProfileCard(row);
}

export type { ContentVisibility };
