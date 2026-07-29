/**
 * Memory Registry Foundation — in-memory catalog (complements memory/policy.ts).
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_MEMORY_KINDS,
  type AiMemoryEntry,
  type AiMemoryKind,
} from "./types";

const KIND_SET = new Set<string>(AI_MEMORY_KINDS);

export function assertMemoryKind(kind: string): asserts kind is AiMemoryKind {
  if (!KIND_SET.has(kind)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown memory kind: ${kind}`
    );
  }
}

export function validateMemoryEntry(input: AiMemoryEntry): AiMemoryEntry {
  const memoryId = input.memoryId.trim();
  const subjectId = input.subjectId.trim();
  const key = input.key.trim();
  if (!memoryId) {
    throw new AiPlatformError("invalid_input", "memoryId is required.");
  }
  if (!subjectId) {
    throw new AiPlatformError("invalid_input", "subjectId is required.");
  }
  if (!key) {
    throw new AiPlatformError("invalid_input", "key is required.");
  }
  assertMemoryKind(input.memoryKind);
  if (!input.value || typeof input.value !== "object" || Array.isArray(input.value)) {
    throw new AiPlatformError(
      "invalid_input",
      "memory value must be a plain object."
    );
  }
  return {
    memoryId,
    memoryKind: input.memoryKind,
    subjectId,
    key,
    value: { ...input.value },
    enabled: Boolean(input.enabled),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export class AiMemoryRegistry {
  private readonly entries = new Map<string, AiMemoryEntry>();

  register(input: Omit<AiMemoryEntry, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  }): AiMemoryEntry {
    const now = new Date().toISOString();
    const entry = validateMemoryEntry({
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    });
    if (this.entries.has(entry.memoryId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Memory already registered: ${entry.memoryId}`
      );
    }
    this.entries.set(entry.memoryId, entry);
    return entry;
  }

  get(memoryId: string): AiMemoryEntry | null {
    return this.entries.get(memoryId) ?? null;
  }

  require(memoryId: string): AiMemoryEntry {
    const entry = this.get(memoryId);
    if (!entry) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown memory: ${memoryId}`
      );
    }
    return entry;
  }

  list(filter?: {
    memoryKind?: AiMemoryKind;
    subjectId?: string;
    enabledOnly?: boolean;
  }): AiMemoryEntry[] {
    return [...this.entries.values()]
      .filter((e) => {
        if (filter?.memoryKind && e.memoryKind !== filter.memoryKind) return false;
        if (filter?.subjectId && e.subjectId !== filter.subjectId) return false;
        if (filter?.enabledOnly && !e.enabled) return false;
        return true;
      })
      .sort((a, b) => a.memoryId.localeCompare(b.memoryId));
  }

  reset(): void {
    this.entries.clear();
  }
}

export const aiMemoryRegistry = new AiMemoryRegistry();
