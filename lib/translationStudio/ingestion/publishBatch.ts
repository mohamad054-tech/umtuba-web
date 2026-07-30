/**
 * App Shell publish batch contract — dry-run / preview only.
 * Never writes product catalog files unless a future explicit GO path is added.
 */

import { isPublishCatalogEligible } from "../status";
import type { StudioSnapshot } from "../types";
import {
  APP_SHELL_NAMESPACES,
  isAppShellCatalogKey,
} from "./appShellInventory";

export type AppShellPublishBatchRecord = {
  namespaceId: string;
  key: string;
  language: string;
  value: string;
  status: "approved" | "ready_for_publish";
  version: number;
  valueId: string;
  keyId: string;
};

export type AppShellPublishBatch = {
  format: "umtuba.app_shell_publish_batch.v1";
  generatedAt: string;
  dryRun: true;
  autoPublish: false;
  writesCatalogFiles: false;
  eligibility: "approved_or_ready_for_publish_only";
  namespaces: readonly string[];
  records: AppShellPublishBatchRecord[];
  /** Distinct catalog keys included in this batch. */
  changedKeys: string[];
  preview: {
    recordCount: number;
    keyCount: number;
    byLanguage: Record<string, number>;
  };
};

export type BuildAppShellPublishBatchOptions = {
  generatedAt?: string;
  /** Optional previous key set to highlight newly eligible keys. */
  previousChangedKeys?: string[];
};

/**
 * Build an App Shell publish batch from approved / ready_for_publish values only.
 * Always dry-run; does not write catalogs.
 */
export function buildAppShellPublishBatch(
  snapshot: StudioSnapshot,
  options: BuildAppShellPublishBatchOptions = {}
): AppShellPublishBatch {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const keyById = new Map(snapshot.keys.map((k) => [k.id, k]));
  const records: AppShellPublishBatchRecord[] = [];
  const changedKeySet = new Set<string>();
  const byLanguage: Record<string, number> = {};

  for (const value of snapshot.values) {
    if (!isPublishCatalogEligible(value.status)) continue;
    if (!value.value.trim()) continue;
    const key = keyById.get(value.keyId);
    if (!key || !isAppShellCatalogKey(key.key)) continue;

    records.push({
      namespaceId: key.namespaceId,
      key: key.key,
      language: value.language,
      value: value.value,
      status: value.status as "approved" | "ready_for_publish",
      version: value.version,
      valueId: value.id,
      keyId: key.id,
    });
    changedKeySet.add(key.key);
    byLanguage[value.language] = (byLanguage[value.language] ?? 0) + 1;
  }

  const changedKeys = [...changedKeySet].sort();

  return {
    format: "umtuba.app_shell_publish_batch.v1",
    generatedAt,
    dryRun: true,
    autoPublish: false,
    writesCatalogFiles: false,
    eligibility: "approved_or_ready_for_publish_only",
    namespaces: APP_SHELL_NAMESPACES,
    records,
    changedKeys,
    preview: {
      recordCount: records.length,
      keyCount: changedKeys.length,
      byLanguage,
    },
  };
}
