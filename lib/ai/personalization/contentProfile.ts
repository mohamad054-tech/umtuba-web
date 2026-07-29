/**
 * Content Profile Foundation — in-memory only.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiContentProfile } from "./types";

function assertUnitScore(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new AiPlatformError(
      "invalid_input",
      `${label} must be a finite number in [0, 1].`
    );
  }
}

export class AiContentProfileStore {
  private readonly profiles = new Map<string, AiContentProfile>();

  create(input: {
    contentId: string;
    contentType: string;
    topicIds?: string[];
    creatorId?: string | null;
    freshnessScore?: number;
    qualityScore?: number;
    metadata?: Record<string, string | number | boolean | null>;
    updatedAt?: string;
  }): AiContentProfile {
    const contentId = input.contentId.trim();
    const contentType = input.contentType.trim();
    if (!contentId) {
      throw new AiPlatformError("invalid_input", "contentId is required.");
    }
    if (!contentType) {
      throw new AiPlatformError("invalid_input", "contentType is required.");
    }
    if (this.profiles.has(contentId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Content profile already exists: ${contentId}`
      );
    }
    const freshnessScore = input.freshnessScore ?? 0.5;
    const qualityScore = input.qualityScore ?? 0.5;
    assertUnitScore(freshnessScore, "freshnessScore");
    assertUnitScore(qualityScore, "qualityScore");

    const topicIds = [...new Set((input.topicIds ?? []).map((t) => t.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );

    const profile: AiContentProfile = {
      contentId,
      contentType,
      topicIds,
      creatorId: input.creatorId ?? null,
      freshnessScore,
      qualityScore,
      metadata: { ...(input.metadata ?? {}) },
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    this.profiles.set(contentId, profile);
    return profile;
  }

  get(contentId: string): AiContentProfile | null {
    return this.profiles.get(contentId) ?? null;
  }

  require(contentId: string): AiContentProfile {
    const profile = this.get(contentId);
    if (!profile) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown content profile: ${contentId}`
      );
    }
    return profile;
  }

  list(): AiContentProfile[] {
    return [...this.profiles.values()].sort((a, b) =>
      a.contentId.localeCompare(b.contentId)
    );
  }

  reset(): void {
    this.profiles.clear();
  }
}

export const aiContentProfiles = new AiContentProfileStore();
