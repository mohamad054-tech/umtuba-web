/**
 * Assistant Runtime Integration — public exports.
 */

export { isAssistantRuntimeEnabled } from "./featureFlag";
export { buildRuntimeContextAssemblyInput } from "./contextSources";
export {
  sanitizeAssistantRuntimeResponse,
  sanitizeRuntimeFailureMessage,
} from "./sanitize";
export { runAssistantRuntime } from "./service";
export type {
  AiAssistantRuntimeInvokeCore,
  AiAssistantRuntimeRouter,
  RunAssistantRuntimeInput,
} from "./service";
export {
  ASSISTANT_RUNTIME_CAPABILITY_ID,
  type AiAssistantRuntimeRequest,
  type AiAssistantRuntimeIdentity,
  type AiAssistantRuntimeContext,
  type AiAssistantSanitizedResponse,
  type AiAssistantRuntimeDiagnostics,
  type AiAssistantRuntimeResult,
  type AiAssistantRuntimeError,
} from "./types";
