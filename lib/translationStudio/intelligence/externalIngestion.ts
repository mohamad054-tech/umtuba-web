/**
 * External translation ingestion — always untrusted until human review.
 */

import { createHash } from "crypto";
import type { StudioLanguageCode } from "../types";
import { buildCorrectionFeedback } from "./feedback";
import type {
  CorrectionFeedback,
  ExternalTranslationImportCandidate,
} from "./types";

export function hashRawResponse(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function createExternalTranslationCandidate(input: {
  serviceName: string;
  providerModel?: string | null;
  sourceText: string;
  candidateText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  rawResponse: string;
  rawResponseRef?: string;
  now?: string;
}): ExternalTranslationImportCandidate {
  const hash = hashRawResponse(input.rawResponse);
  return {
    id: `ext_${hash.slice(0, 16)}`,
    serviceName: input.serviceName,
    providerModel: input.providerModel ?? null,
    sourceText: input.sourceText,
    candidateText: input.candidateText,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    rawResponseRef:
      input.rawResponseRef ?? `external://${input.serviceName}/${hash.slice(0, 12)}`,
    rawResponseHash: hash,
    trustLevel: "untrusted_candidate",
    status: "pending_review",
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function recordExternalApprovalEdits(input: {
  candidate: ExternalTranslationImportCandidate;
  approvedText: string;
  recordedBy?: string | null;
}): CorrectionFeedback {
  return buildCorrectionFeedback({
    candidateText: input.candidate.candidateText,
    approvedText: input.approvedText,
    recordedBy: input.recordedBy ?? null,
    notes: `Reviewed external candidate from ${input.candidate.serviceName}`,
  });
}

export function assertCandidateUntrusted(
  candidate: ExternalTranslationImportCandidate
): void {
  if (candidate.trustLevel !== "untrusted_candidate") {
    throw new Error("External candidate must remain untrusted before review.");
  }
  if (candidate.status !== "pending_review") {
    throw new Error("External candidate is not pending review.");
  }
}
