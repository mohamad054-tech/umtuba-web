/**
 * Bounded AI Core Platform operator note (implementation, not architecture program).
 *
 * Entry: `executeAiGateway` in `lib/ai/gateway.ts`
 * Reference consumer: `runProductDraftAssistant` + seller product editor panel
 * Diagnostics: `/admin/ai` (platform admin only)
 * Config: server env only — see `.env.example` UMTUBA_AI_* / OPENAI_*
 * Persistence: migration `20260871_ai_core_platform_foundation_v1.sql` (local until approved)
 */
export const AI_CORE_PLATFORM_V1 = {
  gateway: "lib/ai/gateway.ts",
  migration: "20260871_ai_core_platform_foundation_v1",
  referenceCapability: "commerce.product_draft_assistant",
  adminRoute: "/admin/ai",
} as const;
