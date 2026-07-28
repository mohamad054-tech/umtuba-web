/**
 * Recent AI Activity contracts — in-memory foundation only (no DB).
 */

import { randomUUID } from "crypto";
import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import type { AiHubActivityItem, AiHubActivityKind, AiHubModuleId } from "./types";

export class AiHubActivityStore {
  private readonly items = new Map<string, AiHubActivityItem[]>();

  reset(): void {
    this.items.clear();
  }

  record(input: {
    userId: string;
    kind: AiHubActivityKind;
    title: string;
    capabilityId?: string | null;
    moduleId?: AiHubModuleId | "platform" | null;
    occurredAt?: string;
  }): AiHubActivityItem {
    if (!isAiUuid(input.userId)) {
      throw new AiPlatformError("unauthenticated", "Valid user is required.");
    }
    const title = input.title.trim();
    if (!title) {
      throw new AiPlatformError("invalid_input", "Activity title is required.");
    }
    const item: AiHubActivityItem = {
      activityId: randomUUID(),
      userId: input.userId,
      kind: input.kind,
      capabilityId: input.capabilityId ?? null,
      moduleId: input.moduleId ?? null,
      title: title.slice(0, 200),
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };
    const list = this.items.get(input.userId) ?? [];
    list.unshift(item);
    this.items.set(input.userId, list.slice(0, 50));
    return item;
  }

  listRecent(userId: string, limit = 10): AiHubActivityItem[] {
    if (!isAiUuid(userId)) {
      throw new AiPlatformError("unauthenticated", "Valid user is required.");
    }
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 10;
    return [...(this.items.get(userId) ?? [])].slice(0, safeLimit);
  }
}

export const aiHubActivityStore = new AiHubActivityStore();
