/**
 * AI Core Provider Foundation V1 — shared types.
 *
 * Capabilities must not hardcode provider/model names; they go through
 * selection via the gateway / foundation APIs only.
 */

import type { AiProviderAdapter } from "./adapters";
import type { AiModelDefinition, AiProviderDefinition } from "../models/registry";

/** Reserved provider ids for future/multi-provider expansion. */
export const AI_KNOWN_PROVIDER_IDS = [
  "stub",
  "openai",
  "gemini",
  "anthropic",
  "local",
] as const;

export type AiKnownProviderId = (typeof AI_KNOWN_PROVIDER_IDS)[number];

export type AiProviderFoundationDescriptor = {
  providerId: string;
  displayName: string;
  /** Operator switch — false means never selectable. */
  enabled: boolean;
  /** Runtime readiness (credentials / process present). */
  available: boolean;
};

export type AiModelFoundationDescriptor = AiModelDefinition & {
  /** Operator switch — false means never selectable even if available. */
  enabled: boolean;
};

export type AiProviderRegistration = {
  descriptor: AiProviderFoundationDescriptor;
  adapter?: AiProviderAdapter | null;
  models?: AiModelFoundationDescriptor[];
};

export type AiProviderFoundationSnapshot = {
  providers: AiProviderFoundationDescriptor[];
  models: AiModelFoundationDescriptor[];
  /** Adapter-backed provider ids only. */
  executableProviderIds: string[];
};

export type { AiProviderAdapter, AiModelDefinition, AiProviderDefinition };
