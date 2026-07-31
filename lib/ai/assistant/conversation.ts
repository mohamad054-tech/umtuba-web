/**
 * Assistant conversation contracts — validation & sanitization.
 */

import { randomUUID } from "crypto";
import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import {
  AI_ASSISTANT_MESSAGE_ROLES,
  AI_ASSISTANT_REQUEST_KINDS,
  AI_ASSISTANT_SKILL_IDS,
  AI_ASSISTANT_TOOL_IDS,
  type AiAssistantConversation,
  type AiAssistantConversationMetadata,
  type AiAssistantMessage,
  type AiAssistantMessageRole,
  type AiAssistantRequestKind,
  type AiAssistantResponse,
  type AiAssistantSkillId,
  type AiAssistantSystemContext,
  type AiAssistantToolId,
  type AiAssistantToolRequest,
  type AiAssistantToolResponse,
} from "./types";

const ROLE_SET = new Set<string>(AI_ASSISTANT_MESSAGE_ROLES);
const SKILL_SET = new Set<string>(AI_ASSISTANT_SKILL_IDS);
const KIND_SET = new Set<string>(AI_ASSISTANT_REQUEST_KINDS);
const TOOL_SET = new Set<string>(AI_ASSISTANT_TOOL_IDS);

const MAX_CONTENT = 8_000;
const MAX_TAGS = 16;
const MAX_TAG_LEN = 64;
const MAX_ARGS = 32;

export function assertAssistantSkillId(
  skillId: string
): asserts skillId is AiAssistantSkillId {
  if (!SKILL_SET.has(skillId)) {
    throw new AiPlatformError("invalid_input", `Unknown skill: ${skillId}`);
  }
}

export function assertAssistantRequestKind(
  kind: string
): asserts kind is AiAssistantRequestKind {
  if (!KIND_SET.has(kind)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown request kind: ${kind}`
    );
  }
}

export function assertAssistantToolId(
  toolId: string
): asserts toolId is AiAssistantToolId {
  if (!TOOL_SET.has(toolId)) {
    throw new AiPlatformError("invalid_input", `Unknown tool: ${toolId}`);
  }
}

function assertRole(role: string): asserts role is AiAssistantMessageRole {
  if (!ROLE_SET.has(role)) {
    throw new AiPlatformError("invalid_input", `Unknown message role: ${role}`);
  }
}

function sanitizeContent(content: string, field: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new AiPlatformError("invalid_input", `${field} is required.`);
  }
  if (trimmed.length > MAX_CONTENT) {
    throw new AiPlatformError(
      "invalid_input",
      `${field} exceeds maximum length.`
    );
  }
  return trimmed;
}

function sanitizeBoundedArgs(
  args: Record<string, unknown> | undefined
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!args) return out;
  const keys = Object.keys(args);
  if (keys.length > MAX_ARGS) {
    throw new AiPlatformError("invalid_input", "Too many tool args.");
  }
  for (const key of keys) {
    const k = key.trim();
    if (!k) {
      throw new AiPlatformError("invalid_input", "Empty tool arg key.");
    }
    const value = args[key];
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new AiPlatformError(
        "invalid_input",
        `Unsupported tool arg type for ${k}.`
      );
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new AiPlatformError(
        "invalid_input",
        `Non-finite tool arg for ${k}.`
      );
    }
    if (typeof value === "string" && value.length > MAX_CONTENT) {
      throw new AiPlatformError(
        "invalid_input",
        `Tool arg ${k} exceeds maximum length.`
      );
    }
    out[k] = value;
  }
  return out;
}

export function validateConversationMetadata(
  input: AiAssistantConversationMetadata
): AiAssistantConversationMetadata {
  const productDomain = input.productDomain.trim();
  const surface = input.surface.trim();
  if (!productDomain || !surface) {
    throw new AiPlatformError(
      "invalid_input",
      "productDomain and surface are required."
    );
  }
  const tags = (input.tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
    .map((t) => (t.length > MAX_TAG_LEN ? t.slice(0, MAX_TAG_LEN) : t));
  return {
    productDomain,
    surface,
    locale: input.locale?.trim() || null,
    workspaceId: input.workspaceId?.trim() || null,
    tags,
  };
}

export function createAssistantConversation(input: {
  userId: string;
  metadata: AiAssistantConversationMetadata;
  conversationId?: string;
}): AiAssistantConversation {
  if (!isAiUuid(input.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user is required.");
  }
  const now = new Date().toISOString();
  const conversationId = input.conversationId?.trim() || randomUUID();
  if (input.conversationId && !isAiUuid(conversationId)) {
    throw new AiPlatformError(
      "invalid_input",
      "conversationId must be a UUID when provided."
    );
  }
  return {
    conversationId,
    userId: input.userId,
    status: "active",
    metadata: validateConversationMetadata(input.metadata),
    messageIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function validateAssistantMessage(
  input: Omit<AiAssistantMessage, "createdAt"> & { createdAt?: string }
): AiAssistantMessage {
  if (!isAiUuid(input.messageId)) {
    throw new AiPlatformError("invalid_input", "messageId must be a UUID.");
  }
  if (!isAiUuid(input.conversationId)) {
    throw new AiPlatformError(
      "invalid_input",
      "conversationId must be a UUID."
    );
  }
  assertRole(input.role);
  return {
    messageId: input.messageId,
    conversationId: input.conversationId,
    role: input.role,
    content: sanitizeContent(input.content, "content"),
    createdAt: input.createdAt ?? new Date().toISOString(),
    toolCallId: input.toolCallId?.trim() || null,
  };
}

/**
 * System context is server-internal. Clients must never receive systemPrompt text.
 */
export function validateSystemContext(
  input: AiAssistantSystemContext
): AiAssistantSystemContext {
  const systemPromptRef = input.systemPromptRef.trim();
  const contextAssemblyId = input.contextAssemblyId.trim();
  if (!systemPromptRef || !contextAssemblyId) {
    throw new AiPlatformError(
      "invalid_input",
      "systemPromptRef and contextAssemblyId are required."
    );
  }
  assertAssistantSkillId(input.skillId);
  assertAssistantRequestKind(input.requestKind);
  return {
    systemPromptRef,
    contextAssemblyId,
    skillId: input.skillId,
    requestKind: input.requestKind,
  };
}

export function validateToolRequest(
  input: Omit<AiAssistantToolRequest, "requestedAt"> & {
    requestedAt?: string;
  }
): AiAssistantToolRequest {
  if (!isAiUuid(input.toolRequestId)) {
    throw new AiPlatformError(
      "invalid_input",
      "toolRequestId must be a UUID."
    );
  }
  if (!isAiUuid(input.conversationId)) {
    throw new AiPlatformError(
      "invalid_input",
      "conversationId must be a UUID."
    );
  }
  assertAssistantToolId(input.toolId);
  return {
    toolRequestId: input.toolRequestId,
    toolId: input.toolId,
    conversationId: input.conversationId,
    args: sanitizeBoundedArgs(input.args),
    requestedAt: input.requestedAt ?? new Date().toISOString(),
  };
}

export function validateToolResponse(
  input: Omit<AiAssistantToolResponse, "completedAt"> & {
    completedAt?: string;
  }
): AiAssistantToolResponse {
  if (!isAiUuid(input.toolRequestId)) {
    throw new AiPlatformError(
      "invalid_input",
      "toolRequestId must be a UUID."
    );
  }
  assertAssistantToolId(input.toolId);
  return {
    toolRequestId: input.toolRequestId,
    toolId: input.toolId,
    ok: Boolean(input.ok),
    data: sanitizeBoundedArgs(input.data),
    errorCode: input.errorCode?.trim() || null,
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
}

/**
 * Build a public assistant response — strips system prompts & provider internals.
 */
export function createAssistantResponse(input: {
  conversationId: string;
  skillId: AiAssistantSkillId;
  requestKind: AiAssistantRequestKind;
  content: string;
  toolRequests?: AiAssistantToolRequest[];
  /** Rejected if present — fail closed against leakage. */
  forbiddenFields?: Record<string, unknown>;
}): AiAssistantResponse {
  if (!isAiUuid(input.conversationId)) {
    throw new AiPlatformError(
      "invalid_input",
      "conversationId must be a UUID."
    );
  }
  assertAssistantSkillId(input.skillId);
  assertAssistantRequestKind(input.requestKind);

  if (input.forbiddenFields) {
    const leakKeys = [
      "systemPrompt",
      "provider",
      "model",
      "apiKey",
      "rawProfile",
    ];
    for (const key of leakKeys) {
      if (key in input.forbiddenFields) {
        throw new AiPlatformError(
          "safety_block",
          `Refusing to attach forbidden field: ${key}`
        );
      }
    }
  }

  const toolRequests = (input.toolRequests ?? []).map((t) =>
    validateToolRequest(t)
  );

  return {
    responseId: randomUUID(),
    conversationId: input.conversationId,
    skillId: input.skillId,
    content: sanitizeContent(input.content, "content"),
    toolRequests,
    publicMeta: {
      requestKind: input.requestKind,
      usedSkills: [input.skillId],
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Client-safe projection of a message — system role content is redacted.
 */
export function toClientSafeMessage(
  message: AiAssistantMessage
): AiAssistantMessage {
  if (message.role === "system") {
    return {
      ...message,
      content: "[redacted]",
    };
  }
  return { ...message };
}
