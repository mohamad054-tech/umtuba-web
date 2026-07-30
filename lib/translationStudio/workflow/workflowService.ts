import { createStubTranslationAiPort } from "../ai/translationAiPort";
import { getTranslationIntelligenceService } from "../intelligence/service";
import { createProvenance, createUsageRights } from "../intelligence/provenance";
import { sourceFingerprint } from "../normalize";
import {
  readPersistedStudioState,
  resolveStudioDataDir,
  writePersistedStudioState,
} from "../persistence/fileStore";
import { buildSeedPersistedState } from "../persistence/seed";
import {
  assertTransitionTranslationStatus,
  isPublishableToMemory,
} from "../status";
import { createSuggestionPipeline } from "../suggestion/pipeline";
import { createTerminologyStore } from "../terminology";
import { createTranslationMemory } from "../translationMemory";
import { detectTerminologyConflicts } from "./terminologyGuard";
import type {
  AuditLogEntry,
  PersistedStudioState,
  StudioLanguageCode,
  StudioSnapshot,
  StudioTranslationValue,
  TranslationSuggestion,
  TranslationValueStatus,
  TranslationVersionRecord,
} from "../types";

export type WorkflowActor = {
  userId: string;
};

export type TranslationStudioWorkflow = {
  getSnapshot(): StudioSnapshot;
  reload(): void;
  persist(): void;
  getValue(valueId: string): StudioTranslationValue | null;
  listReviewQueue(): StudioTranslationValue[];
  listPublishEligible(): StudioTranslationValue[];
  saveDraft(input: {
    valueId: string;
    text: string;
    actor: WorkflowActor;
    note?: string;
  }): StudioTranslationValue;
  submitForReview(input: {
    valueId: string;
    actor: WorkflowActor;
    note?: string;
  }): StudioTranslationValue;
  approve(input: {
    valueId: string;
    actor: WorkflowActor;
    note?: string;
    markReadyForPublish?: boolean;
  }): StudioTranslationValue;
  reject(input: {
    valueId: string;
    actor: WorkflowActor;
    note?: string;
  }): StudioTranslationValue;
  deprecate(input: {
    valueId: string;
    actor: WorkflowActor;
    note?: string;
  }): StudioTranslationValue;
  restore(input: {
    valueId: string;
    actor: WorkflowActor;
    note?: string;
  }): StudioTranslationValue;
  requestAiSuggestion(input: {
    valueId: string;
    actor: WorkflowActor;
  }): Promise<TranslationSuggestion>;
  getHistory(valueId: string): TranslationVersionRecord[];
  getAudit(entityId?: string): AuditLogEntry[];
};

function nextId(prefix: string, seq: { n: number }): string {
  seq.n += 1;
  return `${prefix}_${seq.n}`;
}

export function createTranslationStudioWorkflow(options?: {
  dataDir?: string;
  /** When true, never reads/writes disk — pure in-memory (tests). */
  ephemeral?: boolean;
}): TranslationStudioWorkflow {
  const dataDir = resolveStudioDataDir(options?.dataDir);
  const ephemeral = options?.ephemeral === true;

  let state: PersistedStudioState =
    (!ephemeral ? readPersistedStudioState(dataDir) : null) ??
    buildSeedPersistedState();

  const seq = {
    n:
      state.values.length +
      state.suggestions.length +
      state.versions.length +
      state.auditLog.length +
      1000,
  };

  function save(): void {
    state = { ...state, updatedAt: new Date().toISOString() };
    if (!ephemeral) {
      writePersistedStudioState(dataDir, state);
    }
  }

  function audit(
    entry: Omit<AuditLogEntry, "id" | "createdAt"> & { createdAt?: string }
  ): void {
    state.auditLog.unshift({
      id: nextId("audit", seq),
      createdAt: entry.createdAt ?? new Date().toISOString(),
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      detail: entry.detail,
    });
  }

  function recordVersion(
    value: StudioTranslationValue,
    action: string,
    actorId: string | null,
    note: string | null
  ): void {
    const version: TranslationVersionRecord = {
      id: nextId("ver", seq),
      valueId: value.id,
      keyId: value.keyId,
      language: value.language,
      value: value.value,
      status: value.status,
      version: value.version,
      changedBy: actorId,
      changeAction: action,
      changeNote: note,
      createdAt: new Date().toISOString(),
    };
    state.versions.unshift(version);
  }

  function mutateValue(
    valueId: string,
    action: string,
    actor: WorkflowActor,
    note: string | null,
    mutator: (current: StudioTranslationValue) => StudioTranslationValue
  ): StudioTranslationValue {
    const idx = state.values.findIndex((v) => v.id === valueId);
    if (idx < 0) throw new Error("Unknown translation value.");
    const current = state.values[idx]!;
    const next = mutator({ ...current });
    if (next.status !== current.status) {
      assertTransitionTranslationStatus(current.status, next.status);
    }
    state.values[idx] = next;
    recordVersion(next, action, actor.userId, note);
    audit({
      entityType: "translation_value",
      entityId: next.id,
      action,
      actorId: actor.userId,
      detail: {
        from: current.status,
        to: next.status,
        version: next.version,
        note,
      },
    });
    save();
    return next;
  }

  function rememberIfApproved(value: StudioTranslationValue, actorId: string) {
    if (!isPublishableToMemory(value.status) || !value.value.trim()) return;
    const key = state.keys.find((k) => k.id === value.keyId);
    if (!key) return;
    const fp = sourceFingerprint(key.sourceText);
    const existing = state.memory.find(
      (m) => m.sourceFingerprint === fp && m.language === value.language
    );
    if (existing) {
      existing.translatedText = value.value;
      existing.sourceText = key.sourceText;
      existing.createdAt = new Date().toISOString();
      existing.createdBy = actorId;
    } else {
      state.memory.push({
        id: nextId("tm", seq),
        sourceFingerprint: fp,
        sourceText: key.sourceText,
        language: value.language,
        translatedText: value.value,
        status: "approved",
        namespaceId: key.namespaceId,
        createdAt: new Date().toISOString(),
        createdBy: actorId,
      });
    }
  }

  return {
    getSnapshot() {
      return {
        languages: state.languages,
        namespaces: state.namespaces,
        keys: state.keys,
        values: state.values,
        memory: state.memory,
        terminology: state.terminology,
        suggestions: state.suggestions,
        versions: state.versions,
        auditLog: state.auditLog,
      };
    },
    reload() {
      if (ephemeral) return;
      state = readPersistedStudioState(dataDir) ?? buildSeedPersistedState();
    },
    persist() {
      save();
    },
    getValue(valueId) {
      return state.values.find((v) => v.id === valueId) ?? null;
    },
    listReviewQueue() {
      return state.values.filter(
        (v) =>
          v.status === "draft" ||
          v.status === "ai_suggested" ||
          v.status === "needs_review"
      );
    },
    listPublishEligible() {
      return state.values.filter(
        (v) => v.status === "approved" || v.status === "ready_for_publish"
      );
    },
    saveDraft({ valueId, text, actor, note = null }) {
      return mutateValue(valueId, "save_draft", actor, note, (current) => ({
        ...current,
        value: text,
        status: current.status === "missing" ? "draft" : "draft",
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId,
        version: current.version + 1,
      }));
    },
    submitForReview({ valueId, actor, note = null }) {
      return mutateValue(valueId, "submit_for_review", actor, note, (current) => {
        if (!current.value.trim()) {
          throw new Error("Cannot submit empty translation for review.");
        }
        return {
          ...current,
          status: "needs_review",
          updatedAt: new Date().toISOString(),
          updatedBy: actor.userId,
          version: current.version + 1,
        };
      });
    },
    approve({ valueId, actor, note = null, markReadyForPublish = false }) {
      const next = mutateValue(valueId, "approve", actor, note, (current) => {
        if (!current.value.trim()) {
          throw new Error("Cannot approve empty translation.");
        }
        return {
          ...current,
          status: markReadyForPublish ? "ready_for_publish" : "approved",
          updatedAt: new Date().toISOString(),
          updatedBy: actor.userId,
          approvedBy: actor.userId,
          version: current.version + 1,
        };
      });
      rememberIfApproved(next, actor.userId);
      const key = state.keys.find((k) => k.id === next.keyId);
      if (key && !ephemeral) {
        try {
          const isLearning =
            key.key.startsWith("learning.") ||
            key.namespaceId.includes("learning");
          getTranslationIntelligenceService().recordApprovedTranslation({
            approvedValueId: next.id,
            approvedVersion: next.version,
            sourceText: key.sourceText,
            approvedTargetText: next.value,
            targetLocale: next.language as StudioLanguageCode,
            namespaceId: key.namespaceId,
            domain: isLearning ? "learning" : key.namespaceId,
            contentType: "ui_text",
            styleProfileId: isLearning ? "learning_educational" : undefined,
            provenance: createProvenance({
              type: "human_authored",
              originalSourceOwnership: "umtuba_internal",
            }),
            usageRights: createUsageRights({
              status: "owned_internal",
              permissionReuseInternally: true,
              permissionModelCustomization: true,
            }),
            approverId: actor.userId,
            trustLevel: "trusted_approved",
          });
        } catch {
          // Intelligence recording must not block approval workflow.
        }
      }
      save();
      return next;
    },
    reject({ valueId, actor, note = null }) {
      return mutateValue(valueId, "reject", actor, note, (current) => ({
        ...current,
        status: "rejected",
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId,
        version: current.version + 1,
      }));
    },
    deprecate({ valueId, actor, note = null }) {
      return mutateValue(valueId, "deprecate", actor, note, (current) => ({
        ...current,
        status: "deprecated",
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId,
        version: current.version + 1,
      }));
    },
    restore({ valueId, actor, note = null }) {
      return mutateValue(valueId, "restore", actor, note, (current) => ({
        ...current,
        status: "draft",
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId,
        version: current.version + 1,
      }));
    },
    async requestAiSuggestion({ valueId, actor }) {
      const value = state.values.find((v) => v.id === valueId);
      if (!value) throw new Error("Unknown translation value.");
      const key = state.keys.find((k) => k.id === value.keyId);
      if (!key) throw new Error("Unknown translation key.");

      const memory = createTranslationMemory(state.memory);
      const terminology = createTerminologyStore(state.terminology);
      const pipeline = createSuggestionPipeline({
        memory,
        terminology,
        ai: createStubTranslationAiPort(),
      });

      const started = Date.now();
      const suggestion = await pipeline.propose({
        sourceText: key.sourceText,
        targetLanguage: value.language as StudioLanguageCode,
        keyId: key.id,
        sourceLanguage: "en",
        namespaceHint: key.namespaceId,
      });
      const latencyMs = Date.now() - started;

      const conflicts = detectTerminologyConflicts({
        candidateText: suggestion.candidateText,
        language: value.language,
        terminology: state.terminology,
      });

      const enriched: TranslationSuggestion = {
        ...suggestion,
        id: nextId("sug", seq),
        valueId: value.id,
        createdBy: actor.userId,
        quality: {
          ...suggestion.quality,
          terminologyConflicts: conflicts,
          ai: suggestion.quality.reusedFromMemory
            ? null
            : {
                providerId: suggestion.quality.providerVia,
                modelId: null,
                timestamp: new Date().toISOString(),
                latencyMs,
                confidence: suggestion.quality.confidence,
                rawResponseRef: `studio://suggestion/${suggestion.id}`,
              },
        },
      };

      state.suggestions.unshift(enriched);

      mutateValue(valueId, "ai_suggest", actor, null, (current) => ({
        ...current,
        value: enriched.candidateText,
        status: "ai_suggested",
        suggestionId: enriched.id,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.userId,
        version: current.version + 1,
      }));

      return enriched;
    },
    getHistory(valueId) {
      return state.versions.filter((v) => v.valueId === valueId);
    },
    getAudit(entityId) {
      return entityId
        ? state.auditLog.filter((a) => a.entityId === entityId)
        : [...state.auditLog];
    },
  };
}

let singleton: TranslationStudioWorkflow | null = null;

export function getTranslationStudioWorkflow(): TranslationStudioWorkflow {
  if (!singleton) {
    singleton = createTranslationStudioWorkflow();
  }
  return singleton;
}

/** Test helper */
export function resetTranslationStudioWorkflowForTests(): void {
  singleton = null;
}
