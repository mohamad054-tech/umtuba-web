/**
 * AI Favorites contracts — in-memory foundation only (no DB).
 */

import { randomUUID } from "crypto";
import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import type { AiHubFavoriteItem } from "./types";

export class AiHubFavoriteStore {
  private readonly byUser = new Map<string, AiHubFavoriteItem[]>();

  reset(): void {
    this.byUser.clear();
  }

  add(input: {
    userId: string;
    targetType: AiHubFavoriteItem["targetType"];
    targetId: string;
  }): AiHubFavoriteItem {
    if (!isAiUuid(input.userId)) {
      throw new AiPlatformError("unauthenticated", "Valid user is required.");
    }
    const targetId = input.targetId.trim();
    if (!targetId) {
      throw new AiPlatformError("invalid_input", "targetId is required.");
    }
    const existing = this.byUser.get(input.userId) ?? [];
    const dup = existing.find(
      (f) => f.targetType === input.targetType && f.targetId === targetId
    );
    if (dup) return dup;

    const item: AiHubFavoriteItem = {
      favoriteId: randomUUID(),
      userId: input.userId,
      targetType: input.targetType,
      targetId,
      createdAt: new Date().toISOString(),
    };
    this.byUser.set(input.userId, [item, ...existing].slice(0, 100));
    return item;
  }

  list(userId: string): AiHubFavoriteItem[] {
    if (!isAiUuid(userId)) {
      throw new AiPlatformError("unauthenticated", "Valid user is required.");
    }
    return [...(this.byUser.get(userId) ?? [])];
  }

  remove(userId: string, favoriteId: string): boolean {
    if (!isAiUuid(userId)) {
      throw new AiPlatformError("unauthenticated", "Valid user is required.");
    }
    const list = this.byUser.get(userId) ?? [];
    const next = list.filter((f) => f.favoriteId !== favoriteId);
    this.byUser.set(userId, next);
    return next.length !== list.length;
  }
}

export const aiHubFavoriteStore = new AiHubFavoriteStore();
