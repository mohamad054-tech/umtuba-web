/**
 * Audio/video readiness contracts only — no STT/TTS/dubbing/voice cloning.
 */

import type { MediaIntelligenceMetadata } from "./types";

export type MediaIntelligenceContract = {
  format: "umtuba.translation_intelligence_media.v1";
  processingImplemented: false;
  speechToText: false;
  textToSpeech: false;
  voiceCloning: false;
  dubbingEngine: false;
  metadata: MediaIntelligenceMetadata;
};

export function buildMediaIntelligenceContract(
  metadata: MediaIntelligenceMetadata
): MediaIntelligenceContract {
  return {
    format: "umtuba.translation_intelligence_media.v1",
    processingImplemented: false,
    speechToText: false,
    textToSpeech: false,
    voiceCloning: false,
    dubbingEngine: false,
    metadata: { ...metadata },
  };
}

export function createEmptyMediaMetadata(input: {
  mediaAssetId: string;
  segmentId: string;
}): MediaIntelligenceMetadata {
  return {
    mediaAssetId: input.mediaAssetId,
    speakerIdOrLabel: null,
    segmentId: input.segmentId,
    sourceStartMs: null,
    sourceEndMs: null,
    transcriptConfidence: null,
    approvedTranscript: null,
    approvedTranslation: null,
    targetSpeechDurationMs: null,
    pronunciationNotes: null,
    namedEntityPronunciation: null,
    lipSyncRelevance: null,
    voiceConsentStatus: "unknown",
  };
}
