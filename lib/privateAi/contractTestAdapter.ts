import type { ProviderAdapterContract } from "./types";

export const CONTRACT_TEST_ADAPTER_ID = "adapter_contract_test";
export const CONTRACT_TEST_PROVIDER_ID = "contract-test";

export const CONTRACT_TEST_FIXTURE_TEXT =
  '{"ok":true,"source":"contract_test","inference":false}';

/**
 * Contract-test adapter descriptor.
 * Not production-enabled — must never enter default production routing.
 * Does not call network, Gemini, OpenAI, or any LLM.
 */
export function createContractTestAdapter(
  now = new Date().toISOString()
): ProviderAdapterContract {
  return {
    adapterId: CONTRACT_TEST_ADAPTER_ID,
    providerId: CONTRACT_TEST_PROVIDER_ID,
    adapterKind: "contract_test",
    version: "1.0.0",
    lifecycle: "ready",
    enabled: true,
    productionEnabled: false,
    available: true,
    supportedCapabilities: [
      "reasoning",
      "tool_use",
      "translation",
      "coding",
      "moderation",
      "retrieval",
      "learning",
      "commerce",
      "creator",
    ],
    supportedModels: ["*", "pam_external_general_ref"],
    supportedRuntimeKinds: ["contract_test", "external"],
    supportedInputModes: ["text", "messages", "empty"],
    supportedOutputModes: ["text", "structured", "empty"],
    supportsStreaming: true,
    supportsStructuredOutput: true,
    supportsCancellation: true,
    supportsTimeout: true,
    minPolicyVersion: null,
    maxPayloadBytes: 64_000,
    health: {
      status: "healthy",
      lastCheckedAt: now,
      notes: "Local fixture adapter — no probes.",
    },
    readiness: {
      ready: true,
      blockers: [],
      evaluatedAt: now,
    },
    notes:
      "Contract-test only. productionEnabled=false. No inference / network.",
    registeredAt: now,
    updatedAt: now,
  };
}

/** External provider contract adapter placeholder — not executable. */
export function createExternalContractAdapter(
  now = new Date().toISOString()
): ProviderAdapterContract {
  return {
    adapterId: "adapter_external_provider_contract",
    providerId: "external-provider-contract",
    adapterKind: "external_contract",
    version: "1.0.0",
    lifecycle: "ready",
    enabled: true,
    productionEnabled: true,
    available: true,
    supportedCapabilities: ["reasoning", "tool_use", "coding", "commerce", "creator"],
    supportedModels: ["pam_external_general_ref", "*"],
    supportedRuntimeKinds: ["external"],
    supportedInputModes: ["text", "messages", "empty"],
    supportedOutputModes: ["text", "structured", "empty"],
    supportsStreaming: true,
    supportsStructuredOutput: true,
    supportsCancellation: true,
    supportsTimeout: true,
    minPolicyVersion: null,
    maxPayloadBytes: 128_000,
    health: {
      status: "unknown",
      lastCheckedAt: null,
      notes: "Contract placeholder — no live SDK.",
    },
    readiness: {
      ready: true,
      blockers: [],
      evaluatedAt: now,
    },
    notes: "Boundary registration only — invoke not implemented.",
    registeredAt: now,
    updatedAt: now,
  };
}
