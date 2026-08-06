/**
 * UMTUBA Private AI — Foundation + Workflow/Lifecycle + Deployment/Runtime V1.
 * Architecture / contracts only.
 * Not training. Not fine-tuning. Not inference. No model weights. No live pings.
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

/** Deployment lifecycle for a runtime endpoint (contracts only). */
export type PrivateAiDeploymentState =
  | "pending"
  | "provisioning"
  | "ready"
  | "unhealthy"
  | "maintenance"
  | "offline"
  | "retired";

/** Logical runtime process state (no real engines). */
export type PrivateAiRuntimeState =
  | "unregistered"
  | "registered"
  | "starting"
  | "running"
  | "degraded"
  | "stopped"
  | "failed";

export type RuntimeAvailability =
  | "available"
  | "degraded"
  | "unavailable"
  | "unknown";

export type RuntimeCostTier = "low" | "standard" | "high" | "premium";

export type RuntimeErrorClass =
  | "none"
  | "timeout"
  | "auth"
  | "capacity"
  | "config"
  | "dependency"
  | "unknown";

export type RuntimeHealthSnapshot = {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastHeartbeatAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  errorClass: RuntimeErrorClass;
  availability: RuntimeAvailability;
  notes: string;
};

export type PrivateAiRuntimeRecord = {
  id: string;
  modelId: string;
  label: string;
  providerHint: string | null;
  region: string | null;
  costTier: RuntimeCostTier;
  /** Lower number = higher selection priority. */
  priority: number;
  deploymentState: PrivateAiDeploymentState;
  runtimeState: PrivateAiRuntimeState;
  capabilityIds: AiCapabilityId[];
  hardwareContractId: string | null;
  deploymentProfileId: DeploymentProfileId | null;
  routingContractIds: string[];
  availability: RuntimeAvailability;
  health: RuntimeHealthSnapshot;
  /** Ordered failover candidates (runtime ids). */
  failoverRuntimeIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeReadinessResult = {
  ready: boolean;
  blockers: string[];
};

export type RuntimeSelectionCriteria = {
  capabilityId: AiCapabilityId;
  providerHint?: string | null;
  hardwareContractId?: string | null;
  region?: string | null;
  preferCostTier?: RuntimeCostTier | null;
  requireAvailable?: boolean;
};

export type RuntimeSelectionResult = {
  selected: PrivateAiRuntimeRecord | null;
  candidates: PrivateAiRuntimeRecord[];
  rejected: Array<{ runtimeId: string; reasons: string[] }>;
  failoverChain: string[];
};

export type RuntimeDiagnosticRow = {
  runtimeId: string;
  modelId: string;
  label: string;
  deploymentState: PrivateAiDeploymentState;
  runtimeState: PrivateAiRuntimeState;
  readiness: RuntimeReadinessResult;
  availability: RuntimeAvailability;
  routingEligible: boolean;
  failureReasons: string[];
  health: RuntimeHealthSnapshot;
};

export type PersistedPrivateAiState = {
  schemaVersion: 3;
  updatedAt: string;
  models: PrivateModelRecord[];
  capabilities: CapabilityRecord[];
  hardwareContracts: HardwareContract[];
  deploymentProfiles: DeploymentProfile[];
  routingContracts: RoutingContract[];
  permissions: PrivateAiPermission[];
  auditTrail: PrivateAiAuditTrailEntry[];
  runtimes: PrivateAiRuntimeRecord[];
};
