/**
 * AI Capability Catalog & Service Registry V1 — contracts only.
 * Does not invoke providers, train models, or perform inference.
 */

export type AiCapabilityCategory =
  | "learning"
  | "commerce"
  | "creator"
  | "translation"
  | "moderation"
  | "analytics"
  | "assistant"
  | "private_ai"
  | "admin"
  | "system"
  | "platform";

export type AiCapabilityStability =
  | "experimental"
  | "beta"
  | "stable"
  | "deprecated";

export type AiCapabilityVisibility =
  | "public"
  | "authenticated"
  | "admin"
  | "internal"
  | "hub";

export type AiCapabilityLifecycle =
  | "draft"
  | "registered"
  | "active"
  | "deprecated"
  | "retired"
  | "planned";

export type AiCapabilityExecutionSurface =
  | "shared_ai_service"
  | "private_ai_routing"
  | "hub_placeholder"
  | "none";

export type AiCapabilityPolicySlice = {
  timeoutMs: number | null;
  maxAttempts: number | null;
  retryDelayMs: number | null;
  budgetUnits: number | null;
  quotaPerDay: number | null;
  auditRequired: boolean;
  requireStructuredOutput: boolean;
  allowStreaming: boolean;
};

export type AiCapabilityCatalogEntry = {
  capabilityId: string;
  displayName: string;
  description: string;
  category: AiCapabilityCategory;
  owner: string;
  version: string;
  stability: AiCapabilityStability;
  visibility: AiCapabilityVisibility;
  lifecycle: AiCapabilityLifecycle;
  /** When true, may be invoked through Shared AI aiService (not a live call here). */
  executable: boolean;
  executionSurface: AiCapabilityExecutionSurface;
  requiredPermissions: string[];
  supportedProviders: string[];
  supportedRuntimes: string[];
  requiredModels: string[];
  structuredOutputSupport: boolean;
  streamingSupport: boolean;
  timeoutPolicy: { defaultTimeoutMs: number; maxTimeoutMs: number };
  retryPolicy: { maxAttempts: number; retryDelayMs: number };
  budgetPolicy: { defaultUnits: number };
  quotaPolicy: { dailyHint: number | null };
  auditPolicy: { required: boolean; retainDays: number | null };
  executionPolicy: AiCapabilityPolicySlice;
  deprecated: boolean;
  deprecatedReason: string | null;
  replacementCapabilityId: string | null;
  documentation: {
    summary: string;
    docsPath: string | null;
    sourceModule: string;
  };
  privateAiDomainId: string | null;
  registeredAt: string;
  updatedAt: string;
};

export type CapabilityLookupQuery = {
  category?: AiCapabilityCategory | null;
  providerId?: string | null;
  runtimeKind?: string | null;
  permission?: string | null;
  lifecycle?: AiCapabilityLifecycle | null;
  executableOnly?: boolean;
  includeDeprecated?: boolean;
};

export type CapabilityVersionNegotiation = {
  capabilityId: string;
  requestedVersion: string | null;
  selectedVersion: string | null;
  ok: boolean;
  reason: string;
};

export type CapabilityCompatibilityResult = {
  ok: boolean;
  blockers: string[];
};

export type CapabilityValidationResult = {
  ok: boolean;
  errors: string[];
};
