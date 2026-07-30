/**
 * Build assistant assembly inputs from existing Foundations (no RAG).
 */

import { randomUUID } from "crypto";
import type { AiKnowledgeMemoryFoundation } from "../../knowledge/foundation";
import type { AiUserInterestProfileStore } from "../../personalization/userInterestProfile";
import type { AiAssistantContextAssemblyInput } from "../contextAssembly";
import type {
  AiAssistantDomainContext,
  AiAssistantPersonalizationSummary,
  AiAssistantSkillId,
  AiAssistantUserContext,
} from "../types";

const MAX_SNIPPET = 160;

function truncate(text: string, max = MAX_SNIPPET): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

export type BuildRuntimeContextSourcesInput = {
  assemblyId?: string;
  conversationId: string;
  skillId: AiAssistantSkillId;
  user: AiAssistantUserContext;
  messageText: string;
  domain?: AiAssistantDomainContext | null;
  systemPromptRef?: string | null;
  knowledgeMemory: AiKnowledgeMemoryFoundation;
  interestProfiles: AiUserInterestProfileStore;
};

/**
 * Pull bounded summaries from Knowledge/Memory/Personalization foundations.
 * Uses lexical retrieval only — never claims RAG/vector.
 */
export function buildRuntimeContextAssemblyInput(
  input: BuildRuntimeContextSourcesInput
): AiAssistantContextAssemblyInput {
  const retrieval = input.knowledgeMemory.retrieve({
    queryId: randomUUID(),
    text: input.messageText,
    subjectId: input.user.userId,
    limit: 5,
  });

  const memorySummaries: Array<{ memoryId: string; summary: string }> = [];
  const knowledgeSummaries: Array<{
    knowledgeId: string;
    title: string;
    snippet: string;
  }> = [];

  for (const hit of retrieval.hits) {
    if (hit.kind === "memory") {
      memorySummaries.push({
        memoryId: hit.refId,
        summary: truncate(hit.snippet),
      });
      continue;
    }
    if (hit.kind === "knowledge") {
      const record = input.knowledgeMemory.knowledge.get(hit.refId);
      knowledgeSummaries.push({
        knowledgeId: hit.refId,
        title: record?.title?.trim() || hit.refId,
        snippet: truncate(hit.snippet),
      });
    }
  }

  let personalization: AiAssistantPersonalizationSummary | null = null;
  const profile = input.interestProfiles.get(input.user.userId);
  if (profile) {
    personalization = {
      topicIds: profile.interests.map((t) => t.topicId).slice(0, 32),
      negativeTopicIds: profile.negativeInterests
        .map((t) => t.topicId)
        .slice(0, 32),
      surfaces: profile.surfaces.map(String).slice(0, 16),
    };
  }

  return {
    assemblyId: input.assemblyId?.trim() || randomUUID(),
    conversationId: input.conversationId,
    skillId: input.skillId,
    user: input.user,
    domain: input.domain ?? null,
    personalization,
    memorySummaries,
    knowledgeSummaries,
    systemPromptRef: input.systemPromptRef ?? `assistant.${input.skillId}@1.0.0`,
  };
}
