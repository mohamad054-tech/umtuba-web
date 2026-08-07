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
  isExecutableShadowDualWriteMode,
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
  TRANSLATION_STUDIO_WRITE_RPC_V1,
  parseTranslationStudioUpsertSnapshotResult,
  type TranslationStudioUpsertSnapshotOptions,
  type TranslationStudioUpsertSnapshotResult,
} from "./persistence/writeRpcContract";

export {
  toTranslationStudioWriteSnapshot,
  type TranslationStudioWriteSnapshotV1,
} from "./persistence/writeRpcSnapshot";

export {
  createSupabaseWriteRpcTransport,
  type TranslationStudioRpcClient,
  type TranslationStudioWriteRpcTransport,
} from "./persistence/writeRpcTransport";

export {
  createDbStudioPersistence,
  StudioDbLoadUnsupportedError,
  StudioDbReadError,
  StudioDbSyncLoadUnsupportedError,
  StudioDbSyncSaveUnsupportedError,
  type CreateDbStudioPersistenceOptions,
  type DbStudioPersistence,
  type StudioDbReadErrorCategory,
} from "./persistence/dbStudioPersistence";

export {
  fromTranslationStudioReadSnapshot,
  mapRemoteAuditActorId,
  mapRemoteUuidActorField,
  REMOTE_READ_SUGGESTION_QUALITY_PLACEHOLDER,
} from "./persistence/fromTranslationStudioReadSnapshot";

export {
  createShadowDualWriteStudioPersistence,
  type CreateShadowDualWriteStudioPersistenceOptions,
  type ShadowDualWriteStudioPersistence,
} from "./persistence/shadowDualWriteStudioPersistence";

export {
  getStudioShadowWriteTransport,
  runWithStudioShadowWriteTransport,
  runWithStudioShadowWriteTransportAsync,
  type StudioShadowWriteContext,
} from "./persistence/shadowWriteContext";

export {
  classifyStudioShadowError,
  isRetryableStudioShadowCategory,
} from "./persistence/shadowErrorClassification";

export {
  consoleStudioShadowObserver,
  countStudioShadowEntities,
  noopStudioShadowObserver,
  type StudioShadowEntityCounts,
  type StudioShadowErrorCategory,
  type StudioShadowObserveEvent,
  type StudioShadowObserver,
} from "./persistence/shadowObserver";

export {
  createStudioShadowWriteQueue,
  type StudioShadowIdleDrainResult,
  type StudioShadowJobMeta,
  type StudioShadowWriteQueue,
  type StudioShadowWriteQueueOptions,
} from "./persistence/shadowWriteQueue";

export {
  fingerprintNormalizedStudioSnapshot,
  fingerprintStudioSnapshot,
} from "./persistence/snapshotFingerprint";

export {
  SHADOW_RECONCILIATION_JOURNAL_SCHEMA_VERSION,
  SHADOW_RECONCILIATION_JOURNAL_V1_FILENAME,
  composeStudioShadowObservers,
  createJournalingShadowObserver,
  createShadowReconciliationJournal,
  parseShadowReconciliationJournalLine,
  resolveShadowReconciliationJournalPath,
  type ShadowJournalOutcome,
  type ShadowReconciliationJournal,
  type ShadowReconciliationJournalEntryV1,
} from "./persistence/shadowReconciliationJournal";

export {
  TRANSLATION_STUDIO_READ_RPC_V1,
  parseTranslationStudioReadSnapshot,
  type TranslationStudioReadSnapshotOptions,
  type TranslationStudioReadSnapshotV1,
} from "./persistence/readRpcContract";

export {
  createSupabaseReadRpcTransport,
  type TranslationStudioReadRpcTransport,
} from "./persistence/readRpcTransport";

export {
  canonicalizeJsonValue,
  compareStudioSnapshots,
  createRemoteReadFailedReport,
  deriveAuditActorIdentity,
  fingerprintReadSnapshot,
  isReservedShadowSmokeIdentity,
  isSmokeOnlyClassifiableIdentity,
  type ReconciliationEntityType,
  type ReconciliationFinding,
  type ReconciliationMismatchCategory,
  type ReconciliationRepresentationReasonCode,
  type ReconciliationReport,
  type ReconciliationReportStatus,
} from "./reconciliation/compareStudioSnapshots";

export {
  assessShadowResubmitEligibility,
  type ShadowResubmitEligibility,
} from "./reconciliation/resubmitEligibility";

export {
  buildStudioReconciliationReport,
  loadAuthoritativeStudioJson,
  type BuildReconciliationReportResult,
} from "./reconciliation/buildReconciliationReport";

export {
  SHADOW_SMOKE_ALLOW_ENV,
  SHADOW_SMOKE_V1_DEFAULT_DRAIN_MS,
  SHADOW_SMOKE_V1_IDS,
  SHADOW_SMOKE_V1_JSON_FILENAME,
  SHADOW_SMOKE_V1_PREFIX,
} from "./smoke/shadowSmokeV1Constants";

export {
  assertIsolatedShadowSmokeGates,
  isShadowSmokeAllowEnabled,
  type ShadowSmokeGateFailureCode,
  type ShadowSmokeGateResult,
} from "./smoke/shadowSmokeV1Gates";

export {
  assertOnlyShadowSmokeV1Identities,
  buildShadowSmokeV1State,
  listShadowSmokeV1StableIds,
  type BuildShadowSmokeV1StateOptions,
} from "./smoke/buildShadowSmokeV1State";

export {
  cleanupShadowSmokeV1JsonLocal,
  createShadowSmokeV1JsonPersistence,
  resolveNormalStudioStoreJsonPath,
  resolveShadowSmokeV1JsonPath,
} from "./smoke/shadowSmokeV1Persistence";

export {
  runIsolatedShadowSmokeV1,
  type IsolatedShadowSmokeV1Failure,
  type IsolatedShadowSmokeV1Result,
  type IsolatedShadowSmokeV1SafeEvent,
  type IsolatedShadowSmokeV1Success,
  type RunIsolatedShadowSmokeV1Input,
} from "./smoke/runIsolatedShadowSmokeV1";

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
  stableAppShellMemoryId,
  stableAppShellNamespaceId,
  stableAppShellValueId,
  type AppShellNamespace,
} from "./ingestion/appShellInventory";

export {
  APP_SHELL_INGEST_AUDIT_ID,
  classifyImportedValueStatus,
  ingestAppShellCatalog,
  type AppShellIngestionReport,
  type IngestAppShellOptions,
  type IngestStatusCounts,
} from "./ingestion/ingestAppShellCatalog";

export {
  TRANSLATION_STUDIO_SEED_ACTOR_V1,
  TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
  buildSeedPersistedState,
} from "./persistence/seed";

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
