/**
 * Translation Studio Foundation V1 — domain contracts.
 * In-memory source of truth for this milestone (no DB migration).
 */

import type { AppLocale } from "../i18n/locales";

export type StudioLanguageCode = AppLocale;

export type TranslationValueStatus =
  | "missing"
  | "ai_suggested"
  | "needs_review"
  | "approved"
  | "deprecated";

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
  /** Canonical source text (typically English). */
  sourceText: string;
  description?: string;
};

export type StudioTranslationValue = {
  id: string;
  keyId: string;
  language: StudioLanguageCode;
  value: string;
  status: TranslationValueStatus;
  updatedAt: string;
  /** Set when value came from AI suggestion pipeline (never auto-published). */
  suggestionId?: string | null;
};

export type TranslationMemoryEntry = {
  id: string;
  /** Normalized source fingerprint for duplicate reuse. */
  sourceFingerprint: string;
  sourceText: string;
  language: StudioLanguageCode;
  translatedText: string;
  status: "approved";
  namespaceId?: string | null;
  createdAt: string;
};

export type TerminologyEntry = {
  id: string;
  term: string;
  definition: string;
  notes?: string;
  status: TerminologyStatus;
  /** Approved translation per language (partial OK). */
  translations: Partial<Record<StudioLanguageCode, string>>;
};

export type SuggestionQualityMetadata = {
  confidence: number;
  reusedFromMemory: boolean;
  terminologyHits: string[];
  providerVia: "ai_service" | "stub" | "memory";
  notes?: string;
};

export type TranslationSuggestion = {
  id: string;
  keyId: string | null;
  sourceText: string;
  targetLanguage: StudioLanguageCode;
  candidateText: string;
  quality: SuggestionQualityMetadata;
  status: "pending_review";
  createdAt: string;
};

export type StudioSnapshot = {
  languages: StudioLanguage[];
  namespaces: StudioNamespace[];
  keys: StudioTranslationKey[];
  values: StudioTranslationValue[];
  memory: TranslationMemoryEntry[];
  terminology: TerminologyEntry[];
  suggestions: TranslationSuggestion[];
};
