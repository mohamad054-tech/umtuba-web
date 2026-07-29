/**
 * Assistant Runtime Integration V1 — contracts.
 * Server-side processing cycle only. No Chat UI.
 */

import type { AiErrorCode } from "../../contracts/types";
import type {
  AiAssistantAssembledContext,
  AiAssistantConversation,
  AiAssistantDomainContext,
  AiAssistantRequestKind,
  AiAssistantRoutingDecision,
  AiAssistantSkillId,
  AiAssistantSystemContext,
} from "../types";

export const ASSISTANT_RUNTIME_CAPABILITY_ID = "assistant.runtime_turn" as const;

export type AiAssistantRuntimeRequest = {
  requestKind: AiAssistantRequestKind;
  /** User turn text. */
  messageText: string;
  preferredSkillId?: AiAssistantSkillId | null;
  domain?: AiAssistantDomainContext | null;
  locale?: string | null;
  role?: string | null;
  productDomain?: string;
  surface?: string;
  conversationId?: string;
  /** Prompt *ref* only — never raw system prompt text. */
  systemPromptRef?: string | null;
  tags?: string[];
};

/**
 * Server-owned identity — never accept userId from clients into this object
 * without prior auth resolution.
 */
export type AiAssistantRuntimeIdentity = {
  userId: string;
};

export type AiAssistantRuntimeContext = {
  conversation: AiAssistantConversation;
  routing: AiAssistantRoutingDecision;
  assembled: AiAssistantAssembledContext;
  systemContext: AiAssistantSystemContext;
};

export type AiAssistantSanitizedResponse = {
  responseId: string;
  conversationId: string;
  skillId: AiAssistantSkillId;
  content: string;
  publicMeta: {
    requestKind: AiAssistantRequestKind;
    usedSkills: AiAssistantSkillId[];
  };
  labeledAsAiGenerated: true;
};

export type AiAssistantRuntimeStageName =
  | "flag"
  | "identity"
  | "conversation"
  | "routing"
  | "context_assembly"
  | "ai_service"
  | "sanitization";

export type AiAssistantRuntimeStageDiagnostic = {
  stage: AiAssistantRuntimeStageName;
  ok: boolean;
  detail: string | null;
};

/**
 * Server-only diagnostics — must never include provider/model/apiKey/system prompts.
 */
export type AiAssistantRuntimeDiagnostics = {
  runtimeId: string;
  flagEnabled: boolean;
  skillId: AiAssistantSkillId | null;
  requestKind: AiAssistantRequestKind | null;
  stages: AiAssistantRuntimeStageDiagnostic[];
  aiServiceCapabilityId: string | null;
  aiServiceRunId: string | null;
  usedRag: false;
  usedVectorSearch: false;
  usedSkillExecution: false;
  usedToolInvocation: false;
};

export type AiAssistantRuntimeError = {
  code: AiErrorCode | "runtime_disabled";
  message: string;
};

export type AiAssistantRuntimeResult =
  | {
      ok: true;
      status: "completed";
      response: AiAssistantSanitizedResponse;
      diagnostics: AiAssistantRuntimeDiagnostics;
    }
  | {
      ok: false;
      status: "disabled" | "failed";
      error: AiAssistantRuntimeError;
      diagnostics: AiAssistantRuntimeDiagnostics;
    };
