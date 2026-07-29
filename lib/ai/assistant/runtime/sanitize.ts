/**
 * Sanitize AI service / runtime payloads for public assistant responses.
 * Fail-closed: strips provider internals, system prompts, raw memory/knowledge.
 */

import { randomUUID } from "crypto";
import { AiPlatformError, sanitizeAiErrorMessage } from "../../contracts/errors";
import type { AiServiceResult } from "../../contracts/public";
import { createAssistantResponse } from "../conversation";
import type {
  AiAssistantRequestKind,
  AiAssistantSkillId,
} from "../types";
import type { AiAssistantSanitizedResponse } from "./types";

const FORBIDDEN_KEY_RE =
  /^(systemPrompt|system_prompt|apiKey|api_key|provider|providerId|model|modelId|rawMemory|rawKnowledge|stack|stackTrace)$/i;

function containsForbidden(value: unknown, depth = 0): boolean {
  if (depth > 6 || value == null) return false;
  if (Array.isArray(value)) {
    return value.some((v) => containsForbidden(v, depth + 1));
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEY_RE.test(k)) return true;
      if (containsForbidden(v, depth + 1)) return true;
    }
  }
  return false;
}

function extractContent(result: Record<string, unknown>): string {
  const content = result.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim().slice(0, 8000);
  }
  const message = result.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim().slice(0, 8000);
  }
  throw new AiPlatformError(
    "invalid_structured_output",
    "Assistant runtime result missing safe content."
  );
}

/**
 * Convert aiService success payload into a client-safe assistant response.
 */
export function sanitizeAssistantRuntimeResponse(input: {
  conversationId: string;
  skillId: AiAssistantSkillId;
  requestKind: AiAssistantRequestKind;
  serviceResult: AiServiceResult;
}): AiAssistantSanitizedResponse {
  if (!input.serviceResult.ok) {
    throw new AiPlatformError(
      input.serviceResult.error.code,
      input.serviceResult.error.message
    );
  }

  const raw = input.serviceResult.data.result as Record<string, unknown>;
  if (containsForbidden(raw)) {
    throw new AiPlatformError(
      "safety_block",
      "Refusing to expose forbidden fields in assistant response."
    );
  }

  const built = createAssistantResponse({
    conversationId: input.conversationId,
    skillId: input.skillId,
    requestKind: input.requestKind,
    content: extractContent(raw),
  });

  return {
    responseId: built.responseId || randomUUID(),
    conversationId: built.conversationId,
    skillId: built.skillId,
    content: built.content,
    publicMeta: built.publicMeta,
    labeledAsAiGenerated: true,
  };
}

export function sanitizeRuntimeFailureMessage(
  message: string | undefined
): string {
  const cleaned = sanitizeAiErrorMessage(message);
  const lower = cleaned.toLowerCase();
  if (
    lower.includes("system prompt") ||
    lower.includes("stack") ||
    lower.includes("provider") ||
    lower.includes("model")
  ) {
    return "Assistant request could not be completed.";
  }
  return cleaned;
}
