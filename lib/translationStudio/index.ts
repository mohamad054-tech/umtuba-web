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

export type { StudioPersistencePort } from "./persistence/studioPersistencePort";

export {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODES,
  isExecutableJsonPersistenceMode,
  requestsDbBackedPersistence,
  resolveTranslationStudioPersistenceMode,
  type PersistenceModeResolution,
  type TranslationStudioPersistenceMode,
} from "./persistence/mode";

export {
  createEphemeralStudioPersistence,
  createJsonStudioPersistence,
  createNonDurableStudioPersistence,
} from "./persistence/jsonStudioPersistence";

export {
  createDefaultStudioPersistence,
  type StudioPersistenceSelection,
} from "./persistence/createDefaultStudioPersistence";

export {
  buildPublishContract,
  listPublishQueue,
  type PublishCatalogRecord,
  type PublishContract,
} from "./workflow/publishContract";

export { detectTerminologyConflicts } from "./workflow/terminologyGuard";

export {
  APP_SHELL_NAMESPACES,
  APP_SHELL_SURFACES,
  isAppShellCatalogKey,
  isAppShellNamespace,
  namespaceOfKey,
  stableAppShellKeyId,
  stableAppShellNamespaceId,
  stableAppShellValueId,
  type AppShellNamespace,
} from "./ingestion/appShellInventory";

export {
  classifyImportedValueStatus,
  ingestAppShellCatalog,
  type AppShellIngestionReport,
  type IngestAppShellOptions,
  type IngestStatusCounts,
} from "./ingestion/ingestAppShellCatalog";

export {
  appShellKeysByNamespace,
  summarizeFindings,
  validateAppShellTerminology,
  type AppShellTerminologyFindings,
} from "./ingestion/terminologyReport";

export {
  buildAppShellPublishBatch,
  type AppShellPublishBatch,
  type AppShellPublishBatchRecord,
  type BuildAppShellPublishBatchOptions,
} from "./ingestion/publishBatch";

export type {
  ContentSensitivity,
  CorrectionFeedback,
  ExternalTranslationImportCandidate,
  FeedbackOutcome,
  IntelligenceContentType,
  IntelligenceEligibility,
  IntelligenceIndexEntry,
  MediaIntelligenceMetadata,
  PersistedIntelligenceState,
  ProvenanceRecord,
  ProvenanceType,
  QualityDimensionId,
  QualityScoreReport,
  StyleProfile,
  StyleProfileId,
  TranslationIntelligenceRecord,
  TrustLevel,
  UsageRightsRecord,
  UsageRightsStatus,
} from "./intelligence/types";

export {
  createProvenance,
  createUsageRights,
  isExternalUntrustedProvenance,
  isTrustedProvenance,
} from "./intelligence/provenance";

export {
  canEnterModelCustomizationDataset,
  canEnterTranslationMemory,
  decideIntelligenceEligibility,
} from "./intelligence/eligibility";

export { scoreTranslationQuality } from "./intelligence/qualityScoring";

export {
  STYLE_PROFILES,
  getStyleProfile,
  listStyleProfiles,
  selectStyleProfileForContent,
} from "./intelligence/styleProfiles";

export {
  buildCorrectionFeedback,
  classifyEditOutcome,
  editDistance,
} from "./intelligence/feedback";

export {
  buildMediaIntelligenceContract,
  createEmptyMediaMetadata,
} from "./intelligence/mediaContracts";

export {
  assertCandidateUntrusted,
  createExternalTranslationCandidate,
  hashRawResponse,
  recordExternalApprovalEdits,
} from "./intelligence/externalIngestion";

export {
  createTranslationIntelligenceService,
  getTranslationIntelligenceService,
  resetTranslationIntelligenceForTests,
  type RecordApprovedTranslationInput,
  type TranslationIntelligenceService,
} from "./intelligence/service";
