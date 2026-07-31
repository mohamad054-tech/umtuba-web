/**
 * Learning publish batch — dry-run only, approved entries only.
 */

import { isPublishCatalogEligible } from "../status";
import type { StudioSnapshot } from "../types";
import {
  LEARNING_AREA_NAMESPACES,
  isLearningCatalogKey,
} from "./learningInventory";

export type LearningPublishBatchRecord = {
  namespaceId: string;
  key: string;
  language: string;
  value: string;
  status: "approved" | "ready_for_publish";
  version: number;
  valueId: string;
  keyId: string;
};

export type LearningPublishBatch = {
  format: "umtuba.learning_publish_batch.v1";
  generatedAt: string;
  dryRun: true;
  autoPublish: false;
  writesCatalogFiles: false;
  eligibility: "approved_or_ready_for_publish_only";
  domain: "learning";
  namespaces: readonly string[];
  records: LearningPublishBatchRecord[];
  changedKeys: string[];
  preview: {
    recordCount: number;
    keyCount: number;
    byLanguage: Record<string, number>;
  };
};

export function buildLearningPublishBatch(
  snapshot: StudioSnapshot,
  generatedAt = new Date().toISOString()
): LearningPublishBatch {
  const keyById = new Map(snapshot.keys.map((k) => [k.id, k]));
  const records: LearningPublishBatchRecord[] = [];
  const changedKeys = new Set<string>();
  const byLanguage: Record<string, number> = {};

  for (const value of snapshot.values) {
    if (!isPublishCatalogEligible(value.status)) continue;
    if (!value.value.trim()) continue;
    const key = keyById.get(value.keyId);
    if (!key || !isLearningCatalogKey(key.key)) continue;
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
    changedKeys.add(key.key);
    byLanguage[value.language] = (byLanguage[value.language] ?? 0) + 1;
  }

  const changed = [...changedKeys].sort();
  return {
    format: "umtuba.learning_publish_batch.v1",
    generatedAt,
    dryRun: true,
    autoPublish: false,
    writesCatalogFiles: false,
    eligibility: "approved_or_ready_for_publish_only",
    domain: "learning",
    namespaces: LEARNING_AREA_NAMESPACES,
    records,
    changedKeys: changed,
    preview: {
      recordCount: records.length,
      keyCount: changed.length,
      byLanguage,
    },
  };
}
