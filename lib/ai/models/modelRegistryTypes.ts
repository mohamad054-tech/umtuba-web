/**
 * AI Core Model Registry types — canonical model catalog descriptors.
 * Capabilities must not hardcode model ids; selection goes through Routing Policy.
 */

import type {
  AiCostClass,
  AiDataClassification,
  AiLatencyClass,
  AiModality,
} from "../contracts/types";
import type { AiModelCapabilityClass } from "./registry";

export type AiModelRef = {
  providerId: string;
  modelId: string;
};

export type AiModelRegistryEntry = {
  providerId: string;
  modelId: string;
  displayName: string;
  /** Capability classes this model can serve (chat/structured/tools/…). */
  supportedCapabilities: AiModelCapabilityClass[];
  inputModalities: AiModality[];
  outputModalities: AiModality[];
  /** Operator switch — false means never selectable. */
  enabled: boolean;
  /** Runtime readiness. */
  available: boolean;
  /**
   * Selection priority among eligible models (lower wins).
   * Deterministic routing sorts by this before fallbackOrder.
   */
  priority: number;
  /**
   * Relative order when falling back after a preferred miss (lower tried first).
   */
  fallbackOrder: number;
  contextLimitTokens: number;
  /** Max output tokens when known; null if unknown. */
  outputLimitTokens: number | null;
  structuredOutputSupport: boolean;
  toolCallSupport: boolean;
  streamingSupport: boolean;
  costClass: AiCostClass;
  latencyClass: AiLatencyClass;
  dataHandlingMax: AiDataClassification;
  fallbackEligible: boolean;
  defaultTimeoutMs: number;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
};

export function modelRegistryKey(ref: AiModelRef): string {
  return `${ref.providerId}/${ref.modelId}`;
}
