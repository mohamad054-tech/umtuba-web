/**
 * Public UI-facing AI service contracts.
 * UI and product surfaces may depend only on these types + aiService.
 * They must not import providers, prompts, routers, tools, or gateway internals.
 */

import type { AiErrorCode } from "./types";

export type AiServiceCapabilityId =
  | "commerce.product_draft_assistant"
  | "platform.diagnostics_probe"
  | "platform.translation_suggest"
  | "assistant.runtime_turn"
  | "learning.tutor.explain_lesson"
  | "learning.tutor.summarize_lesson"
  | "learning.tutor.answer_question"
  | "learning.tutor.generate_practice"
  | "learning.tutor.explain_wrong_answer"
  | (string & {});

export type AiServiceContextRefs = {
  storeId?: string;
  productId?: string;
  courseId?: string;
  lessonId?: string;
  projectId?: string;
  workspaceId?: string;
  locale?: string;
  surface: string;
  productDomain: string;
};

export type AiServiceRunRequest = {
  capabilityId: AiServiceCapabilityId;
  input: {
    text?: string;
    notes?: string;
    productId?: string;
    lessonId?: string;
    question?: string;
    /** Owner-scoped assessment attempt for wrong-answer explanation. */
    attemptId?: string;
    /** Question within that attempt to explain. */
    questionId?: string;
  };
  context: AiServiceContextRefs;
  /** Optional allowlisted preference only — never an arbitrary model. */
  preferredModelHint?: string;
};

export type AiServiceSuccess<T = Record<string, unknown>> = {
  runId: string;
  capabilityId: string;
  result: T;
  retryable: false;
};

export type AiServiceFailure = {
  runId: string | null;
  code: AiErrorCode;
  message: string;
  retryable: boolean;
};

export type AiServiceResult<T = Record<string, unknown>> =
  | { ok: true; data: AiServiceSuccess<T> }
  | { ok: false; error: AiServiceFailure };

export const AI_RETRYABLE_CODES: ReadonlySet<AiErrorCode> = new Set([
  "timeout",
  "rate_limited",
  "provider_unavailable",
  "provider_error",
]);

export type ProductDraftAssistantResult = {
  title: string;
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  labeledAsAiGenerated: true;
  autoSaved: false;
  canAlterPrice: false;
  canAlterInventory: false;
  canPublish: false;
  promptVersion: string;
  modelId: string;
};
