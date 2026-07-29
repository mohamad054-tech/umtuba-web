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
  LearningTutorGiveHintResult,
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
  LearningTutorGiveHintActionInput,
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
export { routeModel } from "./routing/router";
export { listTools, invokeTool, installReferenceTools } from "./tools/registry";
