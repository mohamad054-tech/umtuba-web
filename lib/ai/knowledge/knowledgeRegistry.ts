/**
 * Knowledge Registry Foundation — in-memory catalog.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_KNOWLEDGE_SOURCE_KINDS,
  type AiKnowledgeRecord,
  type AiKnowledgeSourceKind,
} from "./types";

const SOURCE_SET = new Set<string>(AI_KNOWLEDGE_SOURCE_KINDS);

export function assertKnowledgeSourceKind(
  kind: string
): asserts kind is AiKnowledgeSourceKind {
  if (!SOURCE_SET.has(kind)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown knowledge source kind: ${kind}`
    );
  }
}

export function validateKnowledgeRecord(
  input: AiKnowledgeRecord
): AiKnowledgeRecord {
  const knowledgeId = input.knowledgeId.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!knowledgeId) {
    throw new AiPlatformError("invalid_input", "knowledgeId is required.");
  }
  if (!title) {
    throw new AiPlatformError("invalid_input", "title is required.");
  }
  if (!body) {
    throw new AiPlatformError("invalid_input", "body is required.");
  }
  assertKnowledgeSourceKind(input.sourceKind);
  const tags = [...new Set(input.tags.map((t) => t.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return {
    knowledgeId,
    sourceKind: input.sourceKind,
    title,
    body,
    tags,
    ownerId: input.ownerId?.trim() ? input.ownerId.trim() : null,
    enabled: Boolean(input.enabled),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export class AiKnowledgeRegistry {
  private readonly records = new Map<string, AiKnowledgeRecord>();

  register(input: Omit<AiKnowledgeRecord, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  }): AiKnowledgeRecord {
    const now = new Date().toISOString();
    const record = validateKnowledgeRecord({
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    });
    if (this.records.has(record.knowledgeId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Knowledge already registered: ${record.knowledgeId}`
      );
    }
    this.records.set(record.knowledgeId, record);
    return record;
  }

  get(knowledgeId: string): AiKnowledgeRecord | null {
    return this.records.get(knowledgeId) ?? null;
  }

  require(knowledgeId: string): AiKnowledgeRecord {
    const record = this.get(knowledgeId);
    if (!record) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown knowledge: ${knowledgeId}`
      );
    }
    return record;
  }

  list(filter?: {
    sourceKind?: AiKnowledgeSourceKind;
    enabledOnly?: boolean;
  }): AiKnowledgeRecord[] {
    return [...this.records.values()]
      .filter((r) => {
        if (filter?.sourceKind && r.sourceKind !== filter.sourceKind) return false;
        if (filter?.enabledOnly && !r.enabled) return false;
        return true;
      })
      .sort((a, b) => a.knowledgeId.localeCompare(b.knowledgeId));
  }

  reset(): void {
    this.records.clear();
  }
}

export const aiKnowledgeRegistry = new AiKnowledgeRegistry();
