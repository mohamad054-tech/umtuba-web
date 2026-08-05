/**
 * UMTUBA Private AI Foundation + Workflow & Lifecycle V1 — domain contracts.
 * Architecture for a future private AI ecosystem.
 * Not training. Not fine-tuning. Not inference. No model weights.
 */

export type PrivateModelClass =
  | "private"
  | "external"
  | "local"
  | "experimental"
  | "archived";

export type AiCapabilityId =
  | "translation"
  | "coding"
  | "learning"
  | "commerce"
  | "creator"
  | "moderation"
  | "reasoning"
  | "retrieval"
  | "speech"
  | "vision"
  | "planning"
  | "tool_use";

export type ModelFamilyKind =
  | "foundation"
  | "specialized"
  | "fine_tuned"
  | "adapter"
  | "embedding"
  | "speech"
  | "vision"
  | "multimodal"
  | "reasoning";

/** Admin review / operations lifecycle (Workflow & Lifecycle V1). */
export type PrivateAiLifecycle =
  | "draft"
  | "submitted_for_review"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "active"
  | "deprecated"
  | "retired";

export type PrivateAiWorkflowAction =
  | "register"
  | "submit_for_review"
  | "request_changes"
  | "reject"
  | "approve"
  | "activate"
  | "deprecate"
  | "retire"
  | "return_to_draft"
  | "lifecycle_update";

export type DeploymentProfileId =
  | "development"
  | "internal"
  | "testing"
  | "production"
  | "offline"
  | "air_gapped";

export type RoutingTargetKind =
  | "external_provider"
  | "local_provider"
  | "private_model"
  | "fallback";

export type PermissionScope =
  | "model"
  | "capability"
  | "dataset"
  | "experiment"
  | "audit";

export type HardwareContract = {
  id: string;
  label: string;
  cpuCoresMin: number;
  gpuRequired: boolean;
  gpuClass: string | null;
  ramGbMin: number;
  storageGbMin: number;
  vramGbMin: number | null;
  acceleration: string[];
  containerProfile: string;
  notes: string;
};

export type DeploymentProfile = {
  id: DeploymentProfileId;
  label: string;
  description: string;
  allowsExternalProviders: boolean;
  requiresAirGap: boolean;
  hardwareContractId: string | null;
};

export type RoutingContract = {
  id: string;
  name: string;
  capabilityId: AiCapabilityId;
  primary: RoutingTargetKind;
  fallbacks: RoutingTargetKind[];
  costOptimization: boolean;
  notes: string;
};

export type CapabilityRecord = {
  id: AiCapabilityId;
  label: string;
  description: string;
  mappedModelIds: string[];
  status: "planned" | "registered" | "deprecated";
  createdAt: string;
  updatedAt: string;
};

export type PrivateModelRecord = {
  id: string;
  name: string;
  modelClass: PrivateModelClass;
  family: ModelFamilyKind;
  version: string;
  capabilities: AiCapabilityId[];
  lifecycle: PrivateAiLifecycle;
  deploymentProfileIds: DeploymentProfileId[];
  hardwareContractId: string | null;
  routingContractIds: string[];
  providerHint: string | null;
  architecture: string;
  notes: string;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PrivateAiPermission = {
  id: string;
  scope: PermissionScope;
  resourceId: string;
  role: string;
  actions: string[];
  granted: boolean;
  notes: string;
};

export type PrivateAiAuditTrailEntry = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  timestamp: string;
  action: PrivateAiWorkflowAction | string;
  reason: string | null;
  previousState: PrivateAiLifecycle | null;
  newState: PrivateAiLifecycle | null;
  modelId: string | null;
  detail: Record<string, unknown>;
};

export type PrivateAiReadinessResult = {
  ready: boolean;
  blockers: string[];
};

export type PersistedPrivateAiState = {
  schemaVersion: 2;
  updatedAt: string;
  models: PrivateModelRecord[];
  capabilities: CapabilityRecord[];
  hardwareContracts: HardwareContract[];
  deploymentProfiles: DeploymentProfile[];
  routingContracts: RoutingContract[];
  permissions: PrivateAiPermission[];
  auditTrail: PrivateAiAuditTrailEntry[];
};
