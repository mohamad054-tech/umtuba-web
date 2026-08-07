/**
 * Rich translation/review context builder (pure). Suitable for future AI calls.
 */

import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import { resolveContextPack, type TranslationContextPack } from "./contextPacks";
import { getLocaleStyleGuide, type LocaleStyleGuide } from "./styleGuides";
import {
  findApplicableTerminology,
  type OfficialTerminologyEntry,
  type TerminologyPolicyCatalog,
} from "./terminologyPolicy";
import {
  PROFESSIONAL_QUALITY_PROFILES,
  type ProfessionalQualityProfile,
} from "./thresholds";
import {
  rankMemoryCandidates,
  type RankedMemoryCandidate,
} from "./memoryPolicy";

export type ProfessionalTranslationRequestContext = {
  keyStableId: string | null;
  namespaceId: string | null;
  namespaceName: string | null;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  sourceText: string;
  currentTranslation: string | null;
  keyDescription: string | null;
  neighboringNotes: string[];
  contextPack: TranslationContextPack;
  styleGuide: LocaleStyleGuide;
  qualityProfile: ProfessionalQualityProfile;
  glossaryTerms: OfficialTerminologyEntry[];
  memoryMatches: RankedMemoryCandidate[];
  statusHint: string | null;
};

export function buildProfessionalTranslationRequestContext(input: {
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  sourceText: string;
  currentTranslation?: string | null;
  keyDescription?: string | null;
  neighboringNotes?: string[];
  keyContextPackId?: string | null;
  domainHint?: string | null;
  terminologyCatalog: TerminologyPolicyCatalog;
  memoryEntries?: TranslationMemoryEntry[];
  statusHint?: string | null;
}): ProfessionalTranslationRequestContext {
  const sourceLocale = input.sourceLocale ?? "en";
  const pack = resolveContextPack({
    keyContextPackId: input.keyContextPackId,
    namespaceHint: input.namespaceName ?? input.namespaceId,
    domainHint: input.domainHint,
  });
  const styleGuide = getLocaleStyleGuide(input.targetLocale);
  const qualityProfile =
    PROFESSIONAL_QUALITY_PROFILES[pack.qualityProfileId] ??
    PROFESSIONAL_QUALITY_PROFILES.standard_ui;
  const glossaryTerms = findApplicableTerminology(
    input.terminologyCatalog,
    input.sourceText,
    pack.glossaryScope
  );
  const memoryMatches = rankMemoryCandidates({
    sourceText: input.sourceText,
    targetLocale: input.targetLocale,
    namespaceId: input.namespaceId ?? null,
    entries: input.memoryEntries ?? [],
    domainScope: pack.glossaryScope,
  });

  return {
    keyStableId: input.keyStableId ?? null,
    namespaceId: input.namespaceId ?? null,
    namespaceName: input.namespaceName ?? null,
    sourceLocale,
    targetLocale: input.targetLocale,
    sourceText: input.sourceText,
    currentTranslation: input.currentTranslation ?? null,
    keyDescription: input.keyDescription ?? null,
    neighboringNotes: input.neighboringNotes ?? [],
    contextPack: pack,
    styleGuide,
    qualityProfile,
    glossaryTerms,
    memoryMatches,
    statusHint: input.statusHint ?? null,
  };
}
