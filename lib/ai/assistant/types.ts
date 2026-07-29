/**
 * AI Assistant Foundation V1 — shared contracts.
 * Cross-product conversational gateway contracts. No UI. No DB. No providers.
 */

export const AI_ASSISTANT_SKILL_IDS = [
  "assistant",
  "learning",
  "commerce",
  "creator",
  "search",
  "world",
  "video",
  "marketing",
  "ads",
] as const;
export type AiAssistantSkillId = (typeof AI_ASSISTANT_SKILL_IDS)[number];

export const AI_ASSISTANT_MESSAGE_ROLES = [
  "system",
  "user",
  "assistant",
  "tool",
] as const;
export type AiAssistantMessageRole =
  (typeof AI_ASSISTANT_MESSAGE_ROLES)[number];

export const AI_ASSISTANT_REQUEST_KINDS = [
  "general_help",
  "learning_help",
  "commerce_help",
  "creator_help",
  "search_query",
  "world_help",
  "video_help",
  "marketing_help",
  "ads_help",
] as const;
export type AiAssistantRequestKind =
  (typeof AI_ASSISTANT_REQUEST_KINDS)[number];

export const AI_ASSISTANT_TOOL_IDS = [
  "search",
  "recommendations",
  "learning",
  "commerce",
  "creator",
  "world",
  "video",
  "marketing",
  "ads",
] as const;
export type AiAssistantToolId = (typeof AI_ASSISTANT_TOOL_IDS)[number];

export type AiAssistantConversationStatus = "active" | "closed";

export type AiAssistantConversationMetadata = {
  productDomain: string;
  surface: string;
  locale: string | null;
  workspaceId: string | null;
  /** Bounded tags only — never free-form PII blobs. */
  tags: string[];
};

export type AiAssistantConversation = {
  conversationId: string;
  userId: string;
  status: AiAssistantConversationStatus;
  metadata: AiAssistantConversationMetadata;
  messageIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AiAssistantMessage = {
  messageId: string;
  conversationId: string;
  role: AiAssistantMessageRole;
  /** User/assistant visible text. System role content is never client-exported. */
  content: string;
  createdAt: string;
  toolCallId?: string | null;
};

export type AiAssistantSystemContext = {
  /** Internal-only preamble id / version — never the raw prompt text to clients. */
  systemPromptRef: string;
  /** Structured context refs assembled server-side. */
  contextAssemblyId: string;
  skillId: AiAssistantSkillId;
  requestKind: AiAssistantRequestKind;
};

export type AiAssistantToolRequest = {
  toolRequestId: string;
  toolId: AiAssistantToolId;
  conversationId: string;
  /** Opaque args — validated per tool schema later; V1 accepts bounded string map. */
  args: Record<string, string | number | boolean | null>;
  requestedAt: string;
};

export type AiAssistantToolResponse = {
  toolRequestId: string;
  toolId: AiAssistantToolId;
  ok: boolean;
  /** Bounded public payload — never provider internals. */
  data: Record<string, string | number | boolean | null>;
  errorCode: string | null;
  completedAt: string;
};

export type AiAssistantResponse = {
  responseId: string;
  conversationId: string;
  skillId: AiAssistantSkillId;
  /** Safe assistant-facing text. */
  content: string;
  toolRequests: AiAssistantToolRequest[];
  /** Never includes system prompts or provider/model internals. */
  publicMeta: {
    requestKind: AiAssistantRequestKind;
    usedSkills: AiAssistantSkillId[];
  };
  createdAt: string;
};

/**
 * Bounded user context for assembly — not a full user profile.
 */
export type AiAssistantUserContext = {
  userId: string;
  locale: string | null;
  role: string | null;
};

/**
 * Domain context refs — ids/labels only.
 */
export type AiAssistantDomainContext = {
  domain: AiAssistantSkillId;
  resourceRefs: Array<{ type: string; id: string }>;
  labels: string[];
};

/**
 * Personalization summary for assistant context — interests only, no raw signals.
 */
export type AiAssistantPersonalizationSummary = {
  topicIds: string[];
  negativeTopicIds: string[];
  surfaces: string[];
};

export type AiAssistantAssembledContextBlock = {
  blockId: string;
  origin:
    | "memory"
    | "knowledge"
    | "personalization"
    | "user"
    | "domain"
    | "system_ref";
  label: string;
  /** Safe textual summary — no secrets / full profiles. */
  text: string;
  order: number;
};

export type AiAssistantAssembledContext = {
  assemblyId: string;
  conversationId: string;
  userId: string;
  skillId: AiAssistantSkillId;
  blocks: AiAssistantAssembledContextBlock[];
  /** Explicitly false in V1 — no RAG/vector path. */
  usedRag: false;
  usedVectorSearch: false;
};

export type AiAssistantSkillDefinition = {
  skillId: AiAssistantSkillId;
  description: string;
  /** Request kinds this skill owns. */
  requestKinds: AiAssistantRequestKind[];
  /** Tool ids this skill may request later (not executed in V1). */
  allowedToolIds: AiAssistantToolId[];
  enabled: boolean;
  /**
   * Skills must never bind to provider/model ids.
   * Reserved empty — enforced by registry validation.
   */
  providerBindingForbidden: true;
};

export type AiAssistantToolDefinition = {
  toolId: AiAssistantToolId;
  description: string;
  domainOwner: AiAssistantSkillId;
  /** V1: tools are registered but not executable. */
  available: false;
  mutating: boolean;
  requiredArgKeys: string[];
};

export type AiAssistantRoutingRequest = {
  requestKind: AiAssistantRequestKind;
  /** Optional soft hint — must not override explicit requestKind. */
  preferredSkillId?: AiAssistantSkillId | null;
  /** Free text is ignored for skill selection in V1 (deterministic contracts). */
  promptText?: string | null;
};

export type AiAssistantRoutingDecision = {
  skillId: AiAssistantSkillId;
  requestKind: AiAssistantRequestKind;
  reason: "request_kind" | "preferred_skill_validated";
  policyId: "assistant_skill_route_v1";
};

/**
 * Reserved future hooks — noop / null in V1.
 */
export type AiAssistantExtensionHooks = {
  multiAgent?: (input: unknown) => unknown | null;
  planner?: (input: unknown) => unknown | null;
  toolChaining?: (input: unknown) => unknown | null;
  longConversations?: (input: unknown) => unknown | null;
  voice?: (input: unknown) => unknown | null;
  multimodal?: (input: unknown) => unknown | null;
  reasoningModels?: (input: unknown) => unknown | null;
};

export function createNoopAssistantExtensionHooks(): AiAssistantExtensionHooks {
  return {
    multiAgent: () => null,
    planner: () => null,
    toolChaining: () => null,
    longConversations: () => null,
    voice: () => null,
    multimodal: () => null,
    reasoningModels: () => null,
  };
}
