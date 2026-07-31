/**
 * Translation Intelligence service — records approved examples for learning metadata.
 * Does not train or fine-tune models. Does not auto-approve.
 */

import { sourceFingerprint } from "../normalize";
import { createTranslationMemory } from "../translationMemory";
import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import {
  canEnterTranslationMemory,
  decideIntelligenceEligibility,
} from "./eligibility";
import {
  assertCandidateUntrusted,
  createExternalTranslationCandidate,
  recordExternalApprovalEdits,
} from "./externalIngestion";
import { buildCorrectionFeedback } from "./feedback";
import {
  emptyIntelligenceState,
  readPersistedIntelligenceState,
  resolveIntelligenceDataDir,
  writePersistedIntelligenceState,
} from "./intelligenceFileStore";
import { createProvenance, createUsageRights } from "./provenance";
import { scoreTranslationQuality } from "./qualityScoring";
import { selectStyleProfileForContent } from "./styleProfiles";
import type {
  ContentSensitivity,
  ExternalTranslationImportCandidate,
  IntelligenceContentType,
  IntelligenceIndexEntry,
  PersistedIntelligenceState,
  ProvenanceRecord,
  StyleProfileId,
  TranslationIntelligenceRecord,
  TrustLevel,
  UsageRightsRecord,
} from "./types";

export type RecordApprovedTranslationInput = {
  approvedValueId: string;
  approvedVersion: number;
  sourceText: string;
  approvedTargetText: string;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  namespaceId?: string | null;
  domain?: string | null;
  contentType?: IntelligenceContentType;
  terminologyRefs?: string[];
  styleProfileId?: StyleProfileId;
  provenance?: ProvenanceRecord;
  suggestionProvenance?: ProvenanceRecord | null;
  reviewerId?: string | null;
  approverId?: string | null;
  usageRights?: UsageRightsRecord;
  trustLevel?: TrustLevel;
  sensitivity?: ContentSensitivity;
  candidateText?: string | null;
  expectedTerminology?: Array<{ term: string; expected: string }>;
  approved?: boolean;
  now?: string;
};

export type TranslationIntelligenceService = {
  getState(): PersistedIntelligenceState;
  listRecords(): TranslationIntelligenceRecord[];
  listIndex(): IntelligenceIndexEntry[];
  recordApprovedTranslation(
    input: RecordApprovedTranslationInput
  ): TranslationIntelligenceRecord | null;
  ingestExternalCandidate(
    input: Parameters<typeof createExternalTranslationCandidate>[0]
  ): ExternalTranslationImportCandidate;
  approveExternalCandidate(input: {
    candidateId: string;
    approvedText: string;
    approverId?: string | null;
    usageRights: UsageRightsRecord;
    namespaceId?: string | null;
    domain?: string | null;
  }): TranslationIntelligenceRecord;
  persist(): void;
};

function upsertIndex(
  index: IntelligenceIndexEntry[],
  record: TranslationIntelligenceRecord,
  now: string
): IntelligenceIndexEntry[] {
  const existing = index.find(
    (e) => e.sourceFingerprint === record.sourceFingerprint
  );
  if (!existing) {
    return [
      ...index,
      {
        id: `idx_${record.sourceFingerprint.slice(0, 16)}`,
        recordId: record.id,
        sourceFingerprint: record.sourceFingerprint,
        domainTags: [record.domain, record.namespaceId].filter(
          Boolean
        ) as string[],
        terminologyUsage: [...record.terminologyRefs],
        approvedTargetVariants: [record.approvedTargetText],
        qualityHistory: [record.quality.overallScore],
        reuseCount: 1,
        reviewerCorrections: record.feedback?.editDistance ? 1 : 0,
        updatedAt: now,
      },
    ];
  }
  const variants = new Set(existing.approvedTargetVariants);
  variants.add(record.approvedTargetText);
  return index.map((e) =>
    e.id === existing.id
      ? {
          ...e,
          recordId: record.id,
          domainTags: [
            ...new Set(
              [...e.domainTags, record.domain, record.namespaceId].filter(
                Boolean
              ) as string[]
            ),
          ],
          terminologyUsage: [
            ...new Set([...e.terminologyUsage, ...record.terminologyRefs]),
          ],
          approvedTargetVariants: [...variants],
          qualityHistory: [
            ...e.qualityHistory,
            record.quality.overallScore,
          ].slice(-20),
          reuseCount: e.reuseCount + 1,
          reviewerCorrections:
            e.reviewerCorrections + (record.feedback?.editDistance ? 1 : 0),
          updatedAt: now,
        }
      : e
  );
}

export function createTranslationIntelligenceService(options?: {
  dataDir?: string;
  ephemeral?: boolean;
  memorySeed?: TranslationMemoryEntry[];
}): TranslationIntelligenceService {
  const dataDir = resolveIntelligenceDataDir(options?.dataDir);
  const ephemeral = options?.ephemeral === true;
  let state: PersistedIntelligenceState =
    (!ephemeral ? readPersistedIntelligenceState(dataDir) : null) ??
    emptyIntelligenceState();
  const memory = createTranslationMemory(options?.memorySeed ?? []);

  function save(): void {
    state = { ...state, updatedAt: new Date().toISOString() };
    if (!ephemeral) writePersistedIntelligenceState(dataDir, state);
  }

  function recordApprovedTranslation(
    input: RecordApprovedTranslationInput
  ): TranslationIntelligenceRecord | null {
    const approved = input.approved !== false;
    if (!approved) return null;

    const now = input.now ?? new Date().toISOString();
    const recordId = `ti_${input.approvedValueId}_v${input.approvedVersion}`;
    const existing = state.records.find((r) => r.id === recordId);
    if (existing) return existing;

    const contentType = input.contentType ?? "ui_text";
    const styleProfileId =
      input.styleProfileId ??
      selectStyleProfileForContent({
        contentType,
        domain: input.domain,
      });
    const provenance =
      input.provenance ??
      createProvenance({
        type: "human_authored",
        originalSourceOwnership: "umtuba_internal",
      });
    const usageRights =
      input.usageRights ??
      createUsageRights({
        status: "owned_internal",
        permissionReuseInternally: true,
        permissionModelCustomization: true,
      });
    const trustLevel = input.trustLevel ?? "trusted_approved";
    const quality = scoreTranslationQuality({
      sourceText: input.sourceText,
      targetText: input.approvedTargetText,
      sourceLocale: input.sourceLocale ?? "en",
      targetLocale: input.targetLocale,
      contentType,
      expectedTerminology: input.expectedTerminology,
    });
    const sensitivity = input.sensitivity ?? "internal";
    const eligibility = decideIntelligenceEligibility({
      approved: true,
      trustLevel,
      usageRights,
      quality,
      sensitivity,
    });

    const feedback = buildCorrectionFeedback({
      candidateText: input.candidateText ?? null,
      approvedText: input.approvedTargetText,
      recordedBy: input.approverId ?? null,
      recordedAt: now,
    });

    const record: TranslationIntelligenceRecord = {
      id: recordId,
      approvedValueId: input.approvedValueId,
      approvedVersion: input.approvedVersion,
      sourceText: input.sourceText,
      approvedTargetText: input.approvedTargetText,
      sourceLocale: input.sourceLocale ?? "en",
      targetLocale: input.targetLocale,
      namespaceId: input.namespaceId ?? null,
      domain: input.domain ?? null,
      contentType,
      terminologyRefs: input.terminologyRefs ?? [],
      styleProfileId,
      provenance,
      suggestionProvenance: input.suggestionProvenance ?? null,
      reviewerId: input.reviewerId ?? null,
      approverId: input.approverId ?? null,
      quality,
      createdAt: now,
      approvedAt: now,
      usageRights,
      trustLevel,
      sensitivity,
      eligibility,
      feedback,
      media: null,
      sourceFingerprint: sourceFingerprint(input.sourceText),
    };

    state.records = [record, ...state.records];
    state.index = upsertIndex(state.index, record, now);

    if (canEnterTranslationMemory(eligibility)) {
      memory.rememberApproved({
        sourceText: input.sourceText,
        language: input.targetLocale,
        translatedText: input.approvedTargetText,
        namespaceId: input.namespaceId ?? null,
        now,
      });
    }

    save();
    return record;
  }

  return {
    getState() {
      return state;
    },
    listRecords() {
      return [...state.records];
    },
    listIndex() {
      return [...state.index];
    },
    recordApprovedTranslation,
    ingestExternalCandidate(input) {
      const candidate = createExternalTranslationCandidate(input);
      if (!state.externalCandidates.some((c) => c.id === candidate.id)) {
        state.externalCandidates = [candidate, ...state.externalCandidates];
        save();
      }
      return candidate;
    },
    approveExternalCandidate(input) {
      const candidate = state.externalCandidates.find(
        (c) => c.id === input.candidateId
      );
      if (!candidate) throw new Error("Unknown external candidate.");
      assertCandidateUntrusted(candidate);

      const feedback = recordExternalApprovalEdits({
        candidate,
        approvedText: input.approvedText,
        recordedBy: input.approverId ?? null,
      });

      const recorded = recordApprovedTranslation({
        approvedValueId: `ext_approved_${candidate.id}`,
        approvedVersion: 1,
        sourceText: candidate.sourceText,
        approvedTargetText: input.approvedText,
        sourceLocale: candidate.sourceLocale,
        targetLocale: candidate.targetLocale,
        namespaceId: input.namespaceId,
        domain: input.domain,
        provenance: createProvenance({
          type: "manual_revision",
          providerName: candidate.serviceName,
          providerModel: candidate.providerModel,
          originalSourceOwnership: "external_reviewed",
          rawResponseRef: candidate.rawResponseRef,
          rawResponseHash: candidate.rawResponseHash,
        }),
        suggestionProvenance: createProvenance({
          type: "external_translation_service",
          providerName: candidate.serviceName,
          providerModel: candidate.providerModel,
          rawResponseRef: candidate.rawResponseRef,
          rawResponseHash: candidate.rawResponseHash,
        }),
        approverId: input.approverId ?? null,
        usageRights: input.usageRights,
        trustLevel: "trusted_approved",
        candidateText: candidate.candidateText,
      });

      if (!recorded) {
        throw new Error("Failed to record approved external translation.");
      }

      const withFeedback: TranslationIntelligenceRecord = {
        ...recorded,
        feedback,
      };
      state.records = state.records.map((r) =>
        r.id === recorded.id ? withFeedback : r
      );
      save();
      return withFeedback;
    },
    persist() {
      save();
    },
  };
}

let singleton: TranslationIntelligenceService | null = null;

export function getTranslationIntelligenceService(): TranslationIntelligenceService {
  if (!singleton) singleton = createTranslationIntelligenceService();
  return singleton;
}

export function resetTranslationIntelligenceForTests(): void {
  singleton = null;
}
