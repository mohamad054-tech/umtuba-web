/**
 * Assistant conversation context assembly.
 * Structured refs only — no RAG / vector execution.
 */

import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import {
  assertAssistantSkillId,
} from "./conversation";
import type {
  AiAssistantAssembledContext,
  AiAssistantAssembledContextBlock,
  AiAssistantDomainContext,
  AiAssistantPersonalizationSummary,
  AiAssistantSkillId,
  AiAssistantUserContext,
} from "./types";

export type AiAssistantContextAssemblyInput = {
  assemblyId: string;
  conversationId: string;
  skillId: AiAssistantSkillId;
  user: AiAssistantUserContext;
  domain?: AiAssistantDomainContext | null;
  personalization?: AiAssistantPersonalizationSummary | null;
  /** Memory summaries already retrieved elsewhere — opaque safe text blobs. */
  memorySummaries?: Array<{ memoryId: string; summary: string }>;
  /** Knowledge summaries — titles/snippets only, not full private docs. */
  knowledgeSummaries?: Array<{ knowledgeId: string; title: string; snippet: string }>;
  /** System prompt *ref* only — never raw system prompt text. */
  systemPromptRef?: string | null;
};

const MAX_BLOCKS = 64;
const MAX_TEXT = 2_000;

function clampText(text: string, field: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AiPlatformError("invalid_input", `${field} is required.`);
  }
  return trimmed.length > MAX_TEXT ? `${trimmed.slice(0, MAX_TEXT - 3)}...` : trimmed;
}

/**
 * Assemble ordered context blocks for an assistant turn.
 * Fail-closed on missing user / invalid ids. No RAG.
 */
export function assembleAssistantContext(
  input: AiAssistantContextAssemblyInput
): AiAssistantAssembledContext {
  const assemblyId = input.assemblyId.trim();
  if (!assemblyId) {
    throw new AiPlatformError("invalid_input", "assemblyId is required.");
  }
  if (!isAiUuid(input.conversationId)) {
    throw new AiPlatformError(
      "invalid_input",
      "conversationId must be a UUID."
    );
  }
  if (!isAiUuid(input.user.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user is required.");
  }
  assertAssistantSkillId(input.skillId);

  const blocks: AiAssistantAssembledContextBlock[] = [];
  let order = 0;

  const push = (
    origin: AiAssistantAssembledContextBlock["origin"],
    label: string,
    text: string,
    blockKey: string
  ) => {
    if (blocks.length >= MAX_BLOCKS) {
      throw new AiPlatformError(
        "context_too_large",
        "Assistant context block limit exceeded."
      );
    }
    blocks.push({
      blockId: `${assemblyId}:${blockKey}`,
      origin,
      label,
      text: clampText(text, label),
      order: order++,
    });
  };

  if (input.systemPromptRef?.trim()) {
    push(
      "system_ref",
      "system_prompt_ref",
      input.systemPromptRef.trim(),
      "system_ref"
    );
  }

  push(
    "user",
    "user_context",
    JSON.stringify({
      userId: input.user.userId,
      locale: input.user.locale?.trim() || null,
      role: input.user.role?.trim() || null,
    }),
    "user"
  );

  if (input.domain) {
    if (input.domain.domain !== input.skillId) {
      throw new AiPlatformError(
        "invalid_input",
        "Domain context skill mismatch."
      );
    }
    const refs = (input.domain.resourceRefs ?? [])
      .slice(0, 32)
      .map((r) => ({
        type: r.type.trim(),
        id: r.id.trim(),
      }))
      .filter((r) => r.type && r.id);
    const labels = (input.domain.labels ?? [])
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 32);
    push(
      "domain",
      `domain:${input.domain.domain}`,
      JSON.stringify({ resourceRefs: refs, labels }),
      "domain"
    );
  }

  if (input.personalization) {
    const topicIds = (input.personalization.topicIds ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 32);
    const negativeTopicIds = (input.personalization.negativeTopicIds ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 32);
    const surfaces = (input.personalization.surfaces ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 16);
    push(
      "personalization",
      "personalization_summary",
      JSON.stringify({ topicIds, negativeTopicIds, surfaces }),
      "personalization"
    );
  }

  for (const mem of input.memorySummaries ?? []) {
    const memoryId = mem.memoryId.trim();
    if (!memoryId) {
      throw new AiPlatformError("invalid_input", "memoryId is required.");
    }
    push("memory", `memory:${memoryId}`, mem.summary, `memory:${memoryId}`);
  }

  for (const kn of input.knowledgeSummaries ?? []) {
    const knowledgeId = kn.knowledgeId.trim();
    if (!knowledgeId) {
      throw new AiPlatformError("invalid_input", "knowledgeId is required.");
    }
    push(
      "knowledge",
      `knowledge:${knowledgeId}`,
      `${kn.title.trim()}: ${kn.snippet}`,
      `knowledge:${knowledgeId}`
    );
  }

  return {
    assemblyId,
    conversationId: input.conversationId,
    userId: input.user.userId,
    skillId: input.skillId,
    blocks,
    usedRag: false,
    usedVectorSearch: false,
  };
}
