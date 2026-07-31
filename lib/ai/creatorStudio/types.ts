/**
 * AI Creator Studio Foundation V1 — contracts only.
 * No live inference / provider calls.
 */

export const AI_CREATOR_STUDIO_VERSION = "ai-creator-studio-foundation-v1";

/** Canonical Shared AI capability used by Creator Studio Foundation. */
export const CREATOR_STUDIO_CAPABILITY_ID = "creator.studio.assist";

export const CREATOR_TEMPLATE_KINDS = [
  "post",
  "video",
  "article",
  "product_description",
  "bio",
  "channel_description",
  "live_title",
  "story_caption",
] as const;

export type CreatorTemplateKind = (typeof CREATOR_TEMPLATE_KINDS)[number];

export type CreatorOutputKind =
  | "plain_text"
  | "structured_json"
  | "title"
  | "description"
  | "hashtags"
  | "seo_metadata"
  | "translation"
  | "moderation_preview";

export type CreatorStudioOperation =
  | "draft"
  | "rewrite"
  | "suggest"
  | "generate_title"
  | "generate_description"
  | "suggest_hashtags"
  | "seo_metadata"
  | "translate"
  | "moderation_preview";

export type CreatorPromptTemplate = {
  templateId: string;
  kind: CreatorTemplateKind;
  displayName: string;
  description: string;
  defaultLocale: string;
  supportedOutputKinds: CreatorOutputKind[];
  supportedOperations: CreatorStudioOperation[];
  promptContract: {
    systemHint: string;
    userPromptSlots: string[];
    structuredSchemaHint: string | null;
  };
  capabilityId: string;
  policyBindingHint: string;
  enabled: boolean;
};

export type CreatorAiSession = {
  sessionId: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  locale: string;
  favoriteTemplateIds: string[];
  activeDraftId: string | null;
};

export type CreatorContentRequest = {
  requestId: string;
  sessionId: string;
  templateId: string;
  operation: CreatorStudioOperation;
  prompt: string;
  locale: string;
  targetLocale?: string | null;
  outputKind: CreatorOutputKind;
  structuredOutput: boolean;
  userId: string;
  tenantId: string;
};

export type CreatorContentResult = {
  resultId: string;
  requestId: string;
  status: "mock_ready" | "blocked" | "rejected" | "requires_approval";
  outputKind: CreatorOutputKind;
  /** Always mock in Foundation V1 — never a live model output. */
  mockOutput: string | null;
  structuredMock: Record<string, string | number | boolean | null> | null;
  unifiedExecutionId: string | null;
  unifiedResult: string | null;
  stopReason: string | null;
  createdAt: string;
};

export type CreatorDraftVersion = {
  versionId: string;
  draftId: string;
  version: number;
  prompt: string;
  mockOutput: string | null;
  createdAt: string;
};

export type CreatorDraft = {
  draftId: string;
  sessionId: string;
  templateId: string;
  title: string;
  latestVersion: number;
  versions: CreatorDraftVersion[];
  updatedAt: string;
};

export type CreatorHistoryEntry = {
  historyId: string;
  sessionId: string;
  requestId: string;
  templateId: string;
  operation: CreatorStudioOperation;
  resultStatus: CreatorContentResult["status"];
  createdAt: string;
};

export type CreatorSuggestionContract = {
  contractId: "suggestion.v1";
  maxSuggestions: number;
  fields: string[];
};

export type CreatorRewriteContract = {
  contractId: "rewrite.v1";
  modes: Array<"shorter" | "clearer" | "more_engaging">;
};

export type CreatorTitleGenerationContract = {
  contractId: "title.v1";
  maxLength: number;
};

export type CreatorDescriptionGenerationContract = {
  contractId: "description.v1";
  maxLength: number;
};

export type CreatorHashtagSuggestionContract = {
  contractId: "hashtags.v1";
  maxTags: number;
};

export type CreatorSeoMetadataContract = {
  contractId: "seo.v1";
  fields: Array<"title" | "description" | "keywords">;
};

export type CreatorTranslationRequestContract = {
  contractId: "translation.v1";
  requiresTargetLocale: true;
};

export type CreatorModerationPreviewContract = {
  contractId: "moderation_preview.v1";
  labels: Array<"safe" | "needs_review" | "blocked_preview">;
};
