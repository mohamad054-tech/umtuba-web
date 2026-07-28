/**
 * Bounded AI Core Platform operator note (Desktop-owned Shared AI Core).
 *
 * Public entry: `aiService.runCapability` (`lib/ai/services/aiService.ts`)
 * Contracts: `lib/ai/contracts/public.ts`
 * Reference capability: `commerce.product_draft_assistant` (server-side only)
 * Isolated diagnostics route: `/admin/ai` (no nav/shell edits)
 * Migration: `20260871_ai_core_platform_foundation_v1.sql` (local until approved)
 * Workstream doc: `docs/ai/workstreams/AI_PLATFORM.md`
 */
export const AI_CORE_PLATFORM_V1 = {
  service: "lib/ai/services/aiService.ts",
  migration: "20260871_ai_core_platform_foundation_v1",
  referenceCapability: "commerce.product_draft_assistant",
  adminRoute: "/admin/ai",
} as const;
