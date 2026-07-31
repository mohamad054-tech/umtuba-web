/**
 * Translation Studio Persistence & Workflow V1 — domain contracts.
 */

import type { AppLocale } from "../i18n/locales";

export type StudioLanguageCode = AppLocale;

/**
 * Review / workflow statuses.
 * `missing` retained for unset values; `draft` is an editable working copy.
 */
export type TranslationValueStatus =
  | "missing"
  | "draft"
  | "ai_suggested"
  | "needs_review"
  | "approved"
  | "rejected"
  | "deprecated"
  | "ready_for_publish";

export type TerminologyStatus = "draft" | "approved" | "deprecated";

export type StudioLanguage = {
  code: StudioLanguageCode;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  enabled: boolean;
};

export type StudioNamespace = {
  id: string;
  name: string;
  description: string;
};

export type StudioTranslationKey = {
  id: string;
  namespaceId: string;
  key: string;
  sourceText: string;
  description?: string;
};

export type StudioTranslationValue = {
  id: string;
  keyId: string;
  language: StudioLanguageCode;
  value: string;
  status: TranslationValueStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  approvedBy: string | null;
  suggestionId?: string | null;
  version: number;
};

export type TranslationVersionRecord = {
  id: string;
  valueId: string;
  keyId: string;
  language: StudioLanguageCode;
  value: string;
  status: TranslationValueStatus;
  version: number;
  changedBy: string | null;
  changeAction: string;
  changeNote: string | null;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  entityType:
    | "translation_value"
    | "suggestion"
    | "terminology"
    | "memory"
    | "publish";
  entityId: string;
  action: string;
  actorId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type TranslationMemoryEntry = {
  id: string;
  sourceFingerprint: string;
  sourceText: string;
  language: StudioLanguageCode;
  translatedText: string;
  status: "approved";
  namespaceId?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

export type TerminologyEntry = {
  id: string;
  term: string;
  definition: string;
  notes?: string;
  status: TerminologyStatus;
  translations: Partial<Record<StudioLanguageCode, string>>;
};

export type SuggestionAiMetadata = {
  providerId: string | null;
  modelId: string | null;
  timestamp: string;
  latencyMs: number;
  confidence: number | null;
  /** Opaque reference — never stores full secret-bearing payloads. */
  rawResponseRef: string;
};

export type SuggestionQualityMetadata = {
  confidence: number;
  reusedFromMemory: boolean;
  terminologyHits: string[];
  terminologyConflicts: TerminologyConflict[];
  providerVia: "ai_service" | "stub" | "memory";
  notes?: string;
  ai?: SuggestionAiMetadata | null;
};

export type TerminologyConflict = {
  term: string;
  expected: string;
  foundFragment: string | null;
  severity: "warning";
};

export type TranslationSuggestion = {
  id: string;
  keyId: string | null;
  valueId: string | null;
  sourceText: string;
  targetLanguage: StudioLanguageCode;
  candidateText: string;
  quality: SuggestionQualityMetadata;
  status: "pending_review" | "accepted" | "rejected" | "superseded";
  createdAt: string;
  createdBy: string | null;
};

export type StudioSnapshot = {
  languages: StudioLanguage[];
  namespaces: StudioNamespace[];
  keys: StudioTranslationKey[];
  values: StudioTranslationValue[];
  memory: TranslationMemoryEntry[];
  terminology: TerminologyEntry[];
  suggestions: TranslationSuggestion[];
  versions: TranslationVersionRecord[];
  auditLog: AuditLogEntry[];
};

export type PersistedStudioState = StudioSnapshot & {
  schemaVersion: 1;
  updatedAt: string;
};
