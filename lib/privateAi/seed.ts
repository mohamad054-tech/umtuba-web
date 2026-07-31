/**
 * Internal seed only — no weights, downloads, training, or inference.
 */

import { buildCapabilityRegistry } from "./capabilities";
import { DEPLOYMENT_PROFILES } from "./deploymentProfiles";
import { HARDWARE_CONTRACTS } from "./hardwareContracts";
import {
  createPrivateAiPermission,
  DEFAULT_PLATFORM_ADMIN_ACTIONS,
} from "./permissions";
import { createEmptyRuntimeHealth } from "./runtimeHealth";
import { DEFAULT_RUNTIME_OPS_POLICY } from "./runtimeOpsPolicy";
import { createEmptyRuntimeOpsState } from "./runtimeOpsState";
import { buildDefaultRoutingContracts } from "./routingContracts";
import type { PersistedPrivateAiState, PrivateAiRuntimeRecord } from "./types";

export function buildPrivateAiSeedState(
  now = new Date().toISOString()
): PersistedPrivateAiState {
  const capabilities = buildCapabilityRegistry(now);
  const routingContracts = buildDefaultRoutingContracts();

  const privateTranslator = {
    id: "pam_umtuba_translator_private",
    name: "UMTUBA Private Translator (planned)",
    modelClass: "private" as const,
    family: "specialized" as const,
    version: "0.0.0-planned",
    capabilities: ["translation"] as const,
    lifecycle: "draft" as const,
    deploymentProfileIds: ["development", "internal", "offline"] as const,
    hardwareContractId: "hw_gpu_internal",
    routingContractIds: ["route_translation_v1"],
    providerHint: "umtuba-private",
    architecture: "registry-placeholder",
    notes: "Architecture placeholder — no weights, no training.",
    reviewReason: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const externalGeneral = {
    id: "pam_external_general_ref",
    name: "External General Reference",
    modelClass: "external" as const,
    family: "foundation" as const,
    version: "ref",
    capabilities: ["reasoning", "tool_use"] as const,
    lifecycle: "approved" as const,
    deploymentProfileIds: ["development", "internal", "testing"] as const,
    hardwareContractId: null as string | null,
    routingContractIds: ["route_reasoning_v1", "route_tool_use_v1"],
    providerHint: "external-provider-contract",
    architecture: "provider-api-contract",
    notes: "External provider contract reference only.",
    reviewReason: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const localEmbedding = {
    id: "pam_local_embedding_exp",
    name: "Local Embedding Experimental",
    modelClass: "experimental" as const,
    family: "embedding" as const,
    version: "exp-0",
    capabilities: ["retrieval"] as const,
    lifecycle: "submitted_for_review" as const,
    deploymentProfileIds: ["development", "air_gapped"] as const,
    hardwareContractId: "hw_airgap_secure",
    routingContractIds: ["route_retrieval_v1"],
    providerHint: "umtuba-local",
    architecture: "embedding-placeholder",
    notes: "Experimental local embedding — no training run.",
    reviewReason: null as string | null,
    createdAt: now,
    updatedAt: now,
  };

  const caps = capabilities.map((c) => {
    const mapped = [privateTranslator, externalGeneral, localEmbedding]
      .filter((m) => (m.capabilities as readonly string[]).includes(c.id))
      .map((m) => m.id);
    return { ...c, mappedModelIds: mapped, updatedAt: now };
  });

  const runtimePrimary: PrivateAiRuntimeRecord = {
    id: "prt_external_general_primary",
    modelId: externalGeneral.id,
    label: "External General Primary Runtime",
    providerHint: "external-provider-contract",
    region: "eu-central",
    costTier: "standard",
    priority: 10,
    deploymentState: "ready",
    runtimeState: "running",
    capabilityIds: ["reasoning", "tool_use"],
    hardwareContractId: null,
    deploymentProfileId: "internal",
    routingContractIds: ["route_reasoning_v1", "route_tool_use_v1"],
    availability: "available",
    health: {
      ...createEmptyRuntimeHealth("Seed health — no live probes."),
      status: "healthy",
      availability: "available",
      lastHeartbeatAt: now,
      lastSuccessAt: now,
    },
    failoverRuntimeIds: ["prt_external_general_failover"],
    ops: createEmptyRuntimeOpsState(),
    notes: "Contract runtime only — no inference.",
    createdAt: now,
    updatedAt: now,
  };

  const runtimeFailover: PrivateAiRuntimeRecord = {
    id: "prt_external_general_failover",
    modelId: externalGeneral.id,
    label: "External General Failover Runtime",
    providerHint: "external-provider-contract",
    region: "eu-west",
    costTier: "high",
    priority: 40,
    deploymentState: "ready",
    runtimeState: "running",
    capabilityIds: ["reasoning", "tool_use"],
    hardwareContractId: null,
    deploymentProfileId: "internal",
    routingContractIds: ["route_reasoning_v1"],
    availability: "available",
    health: {
      ...createEmptyRuntimeHealth("Failover seed — no live probes."),
      status: "healthy",
      availability: "available",
      lastHeartbeatAt: now,
    },
    failoverRuntimeIds: [],
    ops: createEmptyRuntimeOpsState(),
    notes: "Failover contract endpoint.",
    createdAt: now,
    updatedAt: now,
  };

  const runtimeTranslatorPending: PrivateAiRuntimeRecord = {
    id: "prt_translator_pending",
    modelId: privateTranslator.id,
    label: "Private Translator Pending Runtime",
    providerHint: "umtuba-private",
    region: "eu-central",
    costTier: "low",
    priority: 20,
    deploymentState: "pending",
    runtimeState: "registered",
    capabilityIds: ["translation"],
    hardwareContractId: "hw_gpu_internal",
    deploymentProfileId: "development",
    routingContractIds: ["route_translation_v1"],
    availability: "unknown",
    health: createEmptyRuntimeHealth(),
    failoverRuntimeIds: [],
    ops: createEmptyRuntimeOpsState(),
    notes: "Awaiting deployment — model still draft.",
    createdAt: now,
    updatedAt: now,
  };

  return {
    schemaVersion: 4,
    updatedAt: now,
    models: [
      {
        ...privateTranslator,
        capabilities: [...privateTranslator.capabilities],
        deploymentProfileIds: [...privateTranslator.deploymentProfileIds],
      },
      {
        ...externalGeneral,
        capabilities: [...externalGeneral.capabilities],
        deploymentProfileIds: [...externalGeneral.deploymentProfileIds],
      },
      {
        ...localEmbedding,
        capabilities: [...localEmbedding.capabilities],
        deploymentProfileIds: [...localEmbedding.deploymentProfileIds],
      },
    ],
    capabilities: caps,
    hardwareContracts: [...HARDWARE_CONTRACTS],
    deploymentProfiles: [...DEPLOYMENT_PROFILES],
    routingContracts,
    runtimes: [runtimePrimary, runtimeFailover, runtimeTranslatorPending],
    runtimeIncidents: [],
    runtimeOpsPolicy: { ...DEFAULT_RUNTIME_OPS_POLICY },
    permissions: [
      createPrivateAiPermission({
        id: "perm_admin_models",
        scope: "model",
        resourceId: "*",
        role: "platform_admin",
        actions: [...DEFAULT_PLATFORM_ADMIN_ACTIONS],
        granted: true,
        notes: "Platform admin model registry + workflow access.",
      }),
      createPrivateAiPermission({
        id: "perm_admin_capabilities",
        scope: "capability",
        resourceId: "*",
        role: "platform_admin",
        actions: ["read", "map_capability"],
        granted: true,
      }),
      createPrivateAiPermission({
        id: "perm_admin_audit",
        scope: "audit",
        resourceId: "*",
        role: "platform_admin",
        actions: ["audit_read"],
        granted: true,
      }),
      createPrivateAiPermission({
        id: "perm_admin_dataset",
        scope: "dataset",
        resourceId: "*",
        role: "platform_admin",
        actions: ["read"],
        granted: true,
      }),
      createPrivateAiPermission({
        id: "perm_admin_experiment",
        scope: "experiment",
        resourceId: "*",
        role: "platform_admin",
        actions: ["read"],
        granted: true,
      }),
      createPrivateAiPermission({
        id: "perm_reviewer_models",
        scope: "model",
        resourceId: "*",
        role: "model_reviewer",
        actions: ["read", "request_changes", "reject", "approve"],
        granted: true,
        notes: "Reviewer may approve/reject; cannot activate.",
      }),
    ],
    auditTrail: [],
  };
}
