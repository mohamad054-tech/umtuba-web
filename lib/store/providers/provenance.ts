/**
 * Provider isolation — every imported product carries provenance.
 * No orphan provider content.
 */

import type { StoreNormalizedCatalogItem, StoreProvenance, StoreProvider } from "./types";

export function buildStoreProvenance(input: {
  provider: StoreProvider;
  externalId: string;
  syncVersion: number;
  importedAt: string;
  lastSyncedAt: string;
}): StoreProvenance {
  return {
    providerId: input.provider.id,
    externalId: input.externalId,
    sourceType: input.provider.sourceType,
    rightsRecordId: input.provider.rights.id,
    dataClass: input.provider.dataClass,
    syncVersion: input.syncVersion,
    importedAt: input.importedAt,
    lastSyncedAt: input.lastSyncedAt,
  };
}

export function assertStoreItemIsolation(
  item: StoreNormalizedCatalogItem,
  provider: StoreProvider
): { ok: true } | { ok: false; message: string } {
  if (!item.providerId || !item.externalId || !item.rightsRecordId) {
    return { ok: false, message: "Imported catalog items cannot be orphaned from a provider." };
  }
  if (item.providerId !== provider.id) {
    return { ok: false, message: "Item provider_id does not match the importing provider." };
  }
  if (item.provenance.providerId !== provider.id) {
    return { ok: false, message: "Provenance provider_id mismatch." };
  }
  if (item.provenance.rightsRecordId !== provider.rights.id) {
    return { ok: false, message: "Provenance rights_record_id mismatch." };
  }
  if (item.provenance.externalId !== item.externalId) {
    return { ok: false, message: "Provenance external_id mismatch." };
  }
  if (item.dataClass !== provider.dataClass) {
    return { ok: false, message: "Item data class must match the provider." };
  }
  if (item.syncVersion < 1) {
    return { ok: false, message: "sync_version must be >= 1." };
  }
  return { ok: true };
}

export function isStaleSync(lastSyncedAt: string, maxStaleMs: number, nowMs: number): boolean {
  const synced = Date.parse(lastSyncedAt);
  if (!Number.isFinite(synced)) return true;
  return nowMs - synced > maxStaleMs;
}
