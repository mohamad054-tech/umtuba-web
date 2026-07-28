/**
 * Video → Personalization signal ingestion (server-side).
 * Honors feature flag; never writes DB; never sends profiles to providers.
 */

import type { AiPersonalizationEngine } from "../../personalization/engine";
import { isVideoPersonalizationIntegrationEnabled } from "./featureFlag";
import {
  mapVideoEventToFoundationSignalType,
  validateVideoRecommendationSignalInput,
} from "./signalContract";
import type { VideoRecommendationSignalAccepted } from "./types";

export type VideoSignalIngestResult =
  | { ok: true; status: "ingested"; signal: VideoRecommendationSignalAccepted }
  | { ok: true; status: "skipped"; reason: string }
  | { ok: false; code: string; message: string };

export function ingestVideoRecommendationSignal(input: {
  raw: unknown;
  serverUserId: string | null;
  engine: AiPersonalizationEngine;
  enabled?: boolean;
}): VideoSignalIngestResult {
  const enabled =
    typeof input.enabled === "boolean"
      ? input.enabled
      : isVideoPersonalizationIntegrationEnabled();

  if (!enabled) {
    return { ok: true, status: "skipped", reason: "integration_disabled" };
  }

  try {
    const accepted = validateVideoRecommendationSignalInput({
      raw: input.raw,
      serverUserId: input.serverUserId,
    });

    // Ensure a minimal interest profile exists for this user (empty interests).
    if (!input.engine.userStore.get(accepted.userId)) {
      input.engine.userStore.create({
        userId: accepted.userId,
        surfaces: [accepted.surface],
        interests: [],
        negativeInterests: [],
      });
    }

    const foundationType = mapVideoEventToFoundationSignalType(accepted.event);
    input.engine.ingestSignal({
      signalId: [
        accepted.sessionId ?? "nosession",
        accepted.event,
        accepted.contentId,
        accepted.occurredAt,
      ].join(":"),
      userId: accepted.userId,
      contentId: accepted.contentId,
      signalType: foundationType,
      strength: accepted.strength,
      occurredAt: accepted.occurredAt,
      surface: accepted.surface,
    });

    return { ok: true, status: "ingested", signal: accepted };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signal ingest failed.";
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "invalid_input";
    return { ok: false, code, message };
  }
}
