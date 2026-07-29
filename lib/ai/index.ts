/**
 * Shared AI Core — public exports for Domain AI and server adapters.
 * UI must consume only `aiService` / `learningTutorIntegration` + contracts.
 */

export { aiService, runCapability } from "./services/aiService";
export {
  learningTutorIntegration,
  runLearningTutorIntegration,
} from "./services/learningTutorIntegration";
export type {
  AiServiceCapabilityId,
  AiServiceContextRefs,
  AiServiceRunRequest,
  AiServiceResult,
  AiServiceSuccess,
  AiServiceFailure,
  ProductDraftAssistantResult,
} from "./contracts/public";
export type {
  LearningTutorExplainResult,
  LearningTutorSummarizeResult,
  LearningTutorAnswerResult,
  LearningTutorPracticeResult,
  LearningTutorExplainWrongAnswerResult,
  LearningTutorGroundingStatus,
  LearningTutorSourceReference,
} from "./contracts/learningTutor";
export type {
  LearningTutorIntegrationAction,
  LearningTutorIntegrationCapabilityId,
  LearningTutorIntegrationRequest,
  LearningTutorIntegrationResult,
  LearningTutorIntegrationSuccess,
  LearningTutorIntegrationFailure,
} from "./contracts/learningTutorIntegration";
export {
  LEARNING_TUTOR_INTEGRATION_ACTIONS,
  LEARNING_TUTOR_INTEGRATION_CAPABILITIES,
  LEARNING_TUTOR_ACTION_TO_CAPABILITY,
} from "./contracts/learningTutorIntegration";
export type {
  LearningTutorServerActionResult,
  LearningTutorServerActionSuccess,
  LearningTutorServerActionFailure,
  LearningTutorExplainLessonActionInput,
  LearningTutorSummarizeLessonActionInput,
  LearningTutorAnswerQuestionActionInput,
  LearningTutorGeneratePracticeActionInput,
  LearningTutorExplainWrongAnswerActionInput,
} from "./contracts/learningTutorServerActions";
export type { AiErrorCode, AiResult } from "./contracts/types";
export { AiPlatformError, sanitizeAiErrorMessage } from "./contracts/errors";
export { loadAiPlatformConfig, describeAiConfigStatus } from "./config";

/** Domain capability (server-side only; no UI). */
export { runProductDraftAssistant } from "./capabilities/commerce/productDraftAssistant";
export { loadAiPlatformDiagnostics } from "./capabilities/admin/diagnostics";
export {
  runLearningTutorCapability,
  LEARNING_TUTOR_CAPABILITIES,
} from "./capabilities/learning/tutorRunner";

/** Internal modules — Domain AI may use; UI must not. */
export { executeAiGateway } from "./gateway/execute";
export { buildTrustedContext } from "./context/envelope";
export { resolvePrompt, listPromptDefinitions } from "./prompts/registry";
export {
  buildProviderRegistry,
  listAvailableModels,
  findModel,
} from "./models/registry";
export {
  AiModelRegistry,
  toModelRegistryEntry,
} from "./models/modelRegistry";
export type {
  AiModelRef,
  AiModelRegistryEntry,
} from "./models/modelRegistryTypes";
export {
  AiProviderFoundation,
  createProviderFoundation,
} from "./providers/foundation";
export type {
  AiKnownProviderId,
  AiModelFoundationDescriptor,
  AiProviderFoundationDescriptor,
  AiProviderFoundationSnapshot,
  AiProviderRegistration,
} from "./providers/foundationTypes";
export { AI_KNOWN_PROVIDER_IDS } from "./providers/foundationTypes";
export { routeModel } from "./routing/router";
export {
  AiRoutingPolicyEngine,
  createRoutingPolicyEngine,
} from "./routing/policyEngine";
export type {
  AiRoutingPolicyRequest,
  AiRoutingPolicyDecision,
  AiRoutingExtensionHooks,
} from "./routing/policyTypes";
export { createNoopRoutingExtensionHooks } from "./routing/policyTypes";
export {
  recordUsageAfterExecution,
  recordAiServiceUsageAfterExecution,
  listTrackedUsage,
  resetUsageTrackingFoundation,
  aiUsageTracker,
  aiCostTracker,
} from "./usage/trackingFoundation";
export type {
  AiUsageTrackingRecord,
  AiUsageTrackingInput,
  AiUsageExecutionStatus,
  AiUsageCostStatus,
  AiUsageTrackingExtensionHooks,
  AiUsagePublicAggregate,
} from "./usage/trackingTypes";
export { createNoopUsageTrackingExtensionHooks } from "./usage/trackingTypes";
export {
  AiPersonalizationEngine,
  aiPersonalizationEngine,
  resetPersonalizationFoundation,
} from "./personalization/engine";
export {
  AiUserInterestProfileStore,
  aiUserInterestProfiles,
} from "./personalization/userInterestProfile";
export {
  AiContentProfileStore,
  aiContentProfiles,
} from "./personalization/contentProfile";
export {
  AiCandidateSourceRegistry,
  collectCandidates,
  validateCandidate,
} from "./personalization/candidateSources";
export { validateRecommendationSignal } from "./personalization/signals";
export { rankCandidates, scoreCandidate } from "./personalization/scoring";
export {
  computeDiversityPenalties,
  diversityContractSummary,
} from "./personalization/diversity";
export type {
  AiProductSurface,
  AiRecommendationSignalType,
  AiCandidateSourceId,
  AiUserInterestProfile,
  AiContentProfile,
  AiRecommendationSignal,
  AiRecommendationCandidate,
  AiRecommendationScore,
  AiRankedRecommendation,
  AiPersonalizationContext,
  AiPersonalizationExtensionHooks,
} from "./personalization/types";
export {
  AI_PRODUCT_SURFACES,
  AI_RECOMMENDATION_SIGNAL_TYPES,
  AI_CANDIDATE_SOURCE_IDS,
  createNoopPersonalizationExtensionHooks,
} from "./personalization/types";
export { listTools, invokeTool, installReferenceTools } from "./tools/registry";
