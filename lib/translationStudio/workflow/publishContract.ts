/**
 * Publish contract — never auto-publishes.
 * Future publisher reads only Approved / Ready for Publish entries.
 */

import { isPublishCatalogEligible } from "../status";
import type {
  StudioSnapshot,
  StudioTranslationKey,
  StudioTranslationValue,
} from "../types";

export type PublishCatalogRecord = {
  namespaceId: string;
  key: string;
  language: string;
  value: string;
  status: "approved" | "ready_for_publish";
  version: number;
  valueId: string;
  keyId: string;
};

export type PublishContract = {
  format: "umtuba.translation_publish_catalog.v1";
  generatedAt: string;
  /** Explicit: publisher must not include non-eligible statuses. */
  eligibility: "approved_or_ready_for_publish_only";
  autoPublish: false;
  records: PublishCatalogRecord[];
};

export function buildPublishContract(
  snapshot: StudioSnapshot,
  generatedAt = new Date().toISOString()
): PublishContract {
  const keyById = new Map(snapshot.keys.map((k) => [k.id, k]));
  const records: PublishCatalogRecord[] = [];

  for (const value of snapshot.values) {
    if (!isPublishCatalogEligible(value.status)) continue;
    if (!value.value.trim()) continue;
    const key = keyById.get(value.keyId);
    if (!key) continue;
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
  }

  return {
    format: "umtuba.translation_publish_catalog.v1",
    generatedAt,
    eligibility: "approved_or_ready_for_publish_only",
    autoPublish: false,
    records,
  };
}

export function listPublishQueue(
  snapshot: StudioSnapshot
): Array<{ key: StudioTranslationKey; value: StudioTranslationValue }> {
  const keyById = new Map(snapshot.keys.map((k) => [k.id, k]));
  const out: Array<{ key: StudioTranslationKey; value: StudioTranslationValue }> =
    [];
  for (const value of snapshot.values) {
    if (value.status !== "ready_for_publish" && value.status !== "approved") {
      continue;
    }
    const key = keyById.get(value.keyId);
    if (!key) continue;
    out.push({ key, value });
  }
  return out;
}
