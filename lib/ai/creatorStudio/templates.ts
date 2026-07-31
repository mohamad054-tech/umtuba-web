import {
  CREATOR_STUDIO_CAPABILITY_ID,
  type CreatorPromptTemplate,
  type CreatorSuggestionContract,
  type CreatorRewriteContract,
  type CreatorTitleGenerationContract,
  type CreatorDescriptionGenerationContract,
  type CreatorHashtagSuggestionContract,
  type CreatorSeoMetadataContract,
  type CreatorTranslationRequestContract,
  type CreatorModerationPreviewContract,
} from "./types";

export const CREATOR_SUGGESTION_CONTRACT: CreatorSuggestionContract = {
  contractId: "suggestion.v1",
  maxSuggestions: 5,
  fields: ["idea", "angle", "cta"],
};

export const CREATOR_REWRITE_CONTRACT: CreatorRewriteContract = {
  contractId: "rewrite.v1",
  modes: ["shorter", "clearer", "more_engaging"],
};

export const CREATOR_TITLE_CONTRACT: CreatorTitleGenerationContract = {
  contractId: "title.v1",
  maxLength: 80,
};

export const CREATOR_DESCRIPTION_CONTRACT: CreatorDescriptionGenerationContract =
  {
    contractId: "description.v1",
    maxLength: 500,
  };

export const CREATOR_HASHTAG_CONTRACT: CreatorHashtagSuggestionContract = {
  contractId: "hashtags.v1",
  maxTags: 12,
};

export const CREATOR_SEO_CONTRACT: CreatorSeoMetadataContract = {
  contractId: "seo.v1",
  fields: ["title", "description", "keywords"],
};

export const CREATOR_TRANSLATION_CONTRACT: CreatorTranslationRequestContract = {
  contractId: "translation.v1",
  requiresTargetLocale: true,
};

export const CREATOR_MODERATION_CONTRACT: CreatorModerationPreviewContract = {
  contractId: "moderation_preview.v1",
  labels: ["safe", "needs_review", "blocked_preview"],
};

export function buildCreatorPromptTemplates(): CreatorPromptTemplate[] {
  const commonOps = [
    "draft",
    "rewrite",
    "suggest",
    "generate_title",
    "generate_description",
    "suggest_hashtags",
    "seo_metadata",
    "translate",
    "moderation_preview",
  ] as const;

  const defs: Array<
    Pick<
      CreatorPromptTemplate,
      "templateId" | "kind" | "displayName" | "description"
    >
  > = [
    {
      templateId: "tpl.post.v1",
      kind: "post",
      displayName: "Post",
      description: "Short social post draft contract.",
    },
    {
      templateId: "tpl.video.v1",
      kind: "video",
      displayName: "Video",
      description: "Video title/caption draft contract.",
    },
    {
      templateId: "tpl.article.v1",
      kind: "article",
      displayName: "Article",
      description: "Long-form article outline contract.",
    },
    {
      templateId: "tpl.product_description.v1",
      kind: "product_description",
      displayName: "Product Description",
      description: "Commerce-facing product copy contract (no commerce rewrite).",
    },
    {
      templateId: "tpl.bio.v1",
      kind: "bio",
      displayName: "Bio",
      description: "Creator profile bio contract.",
    },
    {
      templateId: "tpl.channel_description.v1",
      kind: "channel_description",
      displayName: "Channel Description",
      description: "Channel about-text contract.",
    },
    {
      templateId: "tpl.live_title.v1",
      kind: "live_title",
      displayName: "Live Title",
      description: "Live stream title contract.",
    },
    {
      templateId: "tpl.story_caption.v1",
      kind: "story_caption",
      displayName: "Story Caption",
      description: "Short story caption contract.",
    },
  ];

  return defs.map((d) => ({
    ...d,
    defaultLocale: "en",
    supportedOutputKinds: [
      "plain_text",
      "structured_json",
      "title",
      "description",
      "hashtags",
      "seo_metadata",
      "translation",
      "moderation_preview",
    ],
    supportedOperations: [...commonOps],
    promptContract: {
      systemHint: `Creator Studio foundation template for ${d.kind}. Contracts only — no live inference.`,
      userPromptSlots: ["topic", "tone", "audience", "constraints"],
      structuredSchemaHint: `{ "title": string, "body": string, "hashtags": string[] }`,
    },
    capabilityId: CREATOR_STUDIO_CAPABILITY_ID,
    policyBindingHint: `binding.${CREATOR_STUDIO_CAPABILITY_ID}.v1`,
    enabled: true,
  }));
}
