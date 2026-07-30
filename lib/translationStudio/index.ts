export type {
  AuditLogEntry,
  PersistedStudioState,
  StudioLanguage,
  StudioLanguageCode,
  StudioNamespace,
  StudioSnapshot,
  StudioTranslationKey,
  StudioTranslationValue,
  SuggestionAiMetadata,
  SuggestionQualityMetadata,
  TerminologyConflict,
  TerminologyEntry,
  TerminologyStatus,
  TranslationMemoryEntry,
  TranslationSuggestion,
  TranslationValueStatus,
  TranslationVersionRecord,
} from "./types";

export {
  assertStudioLanguage,
  isStudioLanguageCode,
  listStudioLanguages,
  resolveStudioLanguageOrNull,
} from "./languages";

export {
  assertTransitionTranslationStatus,
  canTransitionTranslationStatus,
  isPublishCatalogEligible,
  isPublishableToMemory,
  isReviewQueueStatus,
} from "./status";

export { normalizeSourceText, sourceFingerprint } from "./normalize";

export {
  createTranslationMemory,
  type TranslationMemoryStore,
} from "./translationMemory";

export {
  createTerminologyStore,
  seedUmtubaTerminology,
  type TerminologyStore,
} from "./terminology";

export {
  createAiServiceTranslationPort,
  createStubTranslationAiPort,
  type AiServiceRunner,
  type TranslationAiPort,
  type TranslationAiSuggestInput,
  type TranslationAiSuggestOutput,
} from "./ai/translationAiPort";

export {
  createSuggestionPipeline,
  type SuggestionPipeline,
} from "./suggestion/pipeline";

export {
  TRANSLATION_CSV_EXPORT_CONTRACT,
  TRANSLATION_XLIFF_EXPORT_CONTRACT,
  buildJsonExportEnvelope,
  type TranslationCatalogExportRecord,
  type TranslationExportFormat,
  type TranslationImportRequest,
  type TranslationImportResultContract,
  type TranslationJsonExportEnvelope,
} from "./importExport/contracts";

export {
  createTranslationStudio,
  getTranslationStudio,
  type TranslationStudio,
} from "./studio";

export {
  createTranslationStudioWorkflow,
  getTranslationStudioWorkflow,
  resetTranslationStudioWorkflowForTests,
  type TranslationStudioWorkflow,
  type WorkflowActor,
} from "./workflow/workflowService";

export {
  buildPublishContract,
  listPublishQueue,
  type PublishCatalogRecord,
  type PublishContract,
} from "./workflow/publishContract";

export { detectTerminologyConflicts } from "./workflow/terminologyGuard";
