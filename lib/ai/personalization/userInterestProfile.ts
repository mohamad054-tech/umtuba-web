/**
 * User Interest Profile Foundation — in-memory only.
 */

import { AiPlatformError } from "../contracts/errors";
import type {
  AiInterestTopic,
  AiProductSurface,
  AiUserInterestProfile,
} from "./types";

function assertWeight(weight: number, label: string): void {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw new AiPlatformError(
      "invalid_input",
      `${label} weight must be a finite number in [0, 1].`
    );
  }
}

function normalizeTopics(topics: AiInterestTopic[], label: string): AiInterestTopic[] {
  const seen = new Set<string>();
  const out: AiInterestTopic[] = [];
  for (const topic of topics) {
    const topicId = topic.topicId.trim();
    if (!topicId) {
      throw new AiPlatformError("invalid_input", `${label} topicId is required.`);
    }
    if (seen.has(topicId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Duplicate ${label} topicId: ${topicId}`
      );
    }
    assertWeight(topic.weight, label);
    seen.add(topicId);
    out.push({ topicId, weight: topic.weight });
  }
  return out.sort((a, b) => a.topicId.localeCompare(b.topicId));
}

export class AiUserInterestProfileStore {
  private readonly profiles = new Map<string, AiUserInterestProfile>();

  create(input: {
    userId: string;
    surfaces?: AiProductSurface[];
    interests?: AiInterestTopic[];
    negativeInterests?: AiInterestTopic[];
    updatedAt?: string;
  }): AiUserInterestProfile {
    const userId = input.userId.trim();
    if (!userId) {
      throw new AiPlatformError("invalid_input", "userId is required.");
    }
    if (this.profiles.has(userId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Interest profile already exists: ${userId}`
      );
    }
    const profile: AiUserInterestProfile = {
      userId,
      surfaces: [...(input.surfaces ?? [])].sort((a, b) => a.localeCompare(b)),
      interests: normalizeTopics(input.interests ?? [], "interest"),
      negativeInterests: normalizeTopics(
        input.negativeInterests ?? [],
        "negativeInterest"
      ),
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  get(userId: string): AiUserInterestProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  require(userId: string): AiUserInterestProfile {
    const profile = this.get(userId);
    if (!profile) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown interest profile: ${userId}`
      );
    }
    return profile;
  }

  upsertInterests(
    userId: string,
    interests: AiInterestTopic[]
  ): AiUserInterestProfile {
    const existing = this.require(userId);
    const next: AiUserInterestProfile = {
      ...existing,
      interests: normalizeTopics(interests, "interest"),
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(userId, next);
    return next;
  }

  list(): AiUserInterestProfile[] {
    return [...this.profiles.values()].sort((a, b) =>
      a.userId.localeCompare(b.userId)
    );
  }

  reset(): void {
    this.profiles.clear();
  }
}

export const aiUserInterestProfiles = new AiUserInterestProfileStore();
