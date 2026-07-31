/**
 * Creator Studio Foundation service.
 * Every generation request goes through Unified Capability Execution only.
 * Returns mock contracts — never live model output.
 */

import {
  executeUnifiedCapability,
  isUnifiedExecutionReady,
} from "../execution";
import { AiPlatformError } from "../contracts/errors";
import {
  creatorStudioStore,
  creatorStudioTemplateRegistry,
} from "./registry";
import {
  CREATOR_STUDIO_CAPABILITY_ID,
  type CreatorContentRequest,
  type CreatorContentResult,
  type CreatorStudioOperation,
} from "./types";

function mockFor(
  operation: CreatorStudioOperation,
  prompt: string,
  structured: boolean
): Pick<CreatorContentResult, "mockOutput" | "structuredMock"> {
  const base = `[Creator Studio Foundation mock · ${operation}] ${prompt.slice(0, 120)}`;
  if (!structured) {
    return { mockOutput: base, structuredMock: null };
  }
  return {
    mockOutput: base,
    structuredMock: {
      title: `Mock title for ${operation}`,
      body: base,
      hashtags: "#umtuba #creator #foundation",
      status: "mock_only",
    },
  };
}

export type RunCreatorStudioInput = {
  sessionId: string;
  templateId: string;
  operation: CreatorStudioOperation;
  prompt: string;
  locale?: string;
  targetLocale?: string | null;
  outputKind?: CreatorContentRequest["outputKind"];
  structuredOutput?: boolean;
  draftId?: string | null;
};

/**
 * Validate contracts, run Unified Execution, then attach mock foundation result.
 */
export function runCreatorStudioRequest(
  input: RunCreatorStudioInput
): {
  request: CreatorContentRequest;
  result: CreatorContentResult;
  unifiedExecutionId: string;
} {
  const session = creatorStudioStore.getSession(input.sessionId);
  if (!session) {
    throw new AiPlatformError("invalid_input", "Unknown Creator Studio session.");
  }
  const template = creatorStudioTemplateRegistry.require(input.templateId);
  if (!template.supportedOperations.includes(input.operation)) {
    throw new AiPlatformError(
      "invalid_input",
      `Operation not supported for template: ${input.operation}`
    );
  }
  if (input.operation === "translate" && !input.targetLocale?.trim()) {
    throw new AiPlatformError(
      "invalid_input",
      "targetLocale is required for translate."
    );
  }
  if (!input.prompt.trim()) {
    throw new AiPlatformError("invalid_input", "prompt is required.");
  }
  if (template.capabilityId !== CREATOR_STUDIO_CAPABILITY_ID) {
    throw new AiPlatformError(
      "configuration_invalid",
      "Template capability mapping is invalid."
    );
  }

  const request = creatorStudioStore.buildRequest({
    sessionId: session.sessionId,
    templateId: template.templateId,
    operation: input.operation,
    prompt: input.prompt.trim(),
    locale: input.locale ?? session.locale,
    targetLocale: input.targetLocale ?? null,
    outputKind: input.outputKind ?? "plain_text",
    structuredOutput: Boolean(input.structuredOutput),
    userId: session.userId,
    tenantId: session.tenantId,
  });

  const unified = executeUnifiedCapability({
    requestId: request.requestId,
    capabilityId: CREATOR_STUDIO_CAPABILITY_ID,
    tenantId: session.tenantId,
    userId: session.userId,
    runtimeId: "shared_ai_gateway",
    correlationId: session.sessionId,
    surface: "creator_studio",
    productDomain: "creator",
  });

  let status: CreatorContentResult["status"] = "mock_ready";
  if (unified.result === "requires_approval") status = "requires_approval";
  else if (unified.result === "blocked") status = "blocked";
  else if (!isUnifiedExecutionReady(unified)) status = "rejected";

  const mock =
    status === "mock_ready"
      ? mockFor(request.operation, request.prompt, request.structuredOutput)
      : { mockOutput: null, structuredMock: null };

  const result: CreatorContentResult = {
    resultId: `cres_${request.requestId}`,
    requestId: request.requestId,
    status,
    outputKind: request.outputKind,
    mockOutput: mock.mockOutput,
    structuredMock: mock.structuredMock,
    unifiedExecutionId: unified.executionId,
    unifiedResult: unified.result,
    stopReason: unified.audit.stopReason,
    createdAt: new Date().toISOString(),
  };

  creatorStudioStore.recordResult(result);
  creatorStudioStore.recordHistory({
    sessionId: session.sessionId,
    requestId: request.requestId,
    templateId: template.templateId,
    operation: request.operation,
    resultStatus: result.status,
    createdAt: result.createdAt,
  });

  if (status === "mock_ready" && input.draftId) {
    creatorStudioStore.addDraftVersion(
      input.draftId,
      request.prompt,
      result.mockOutput
    );
  }

  return {
    request,
    result,
    unifiedExecutionId: unified.executionId,
  };
}
