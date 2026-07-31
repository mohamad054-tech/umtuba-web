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
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastHeartbeatSource: string | null;
  lastLatencyMs: number | null;
};

export type RuntimeOpsPolicy = {
  missedHeartbeatMs: number;
  consecutiveFailureThreshold: number;
  consecutiveSuccessThreshold: number;
  maxRetries: number;
  retryDelayMs: number;
  cooldownMs: number;
  recoveryGraceMs: number;
  failoverSuppressionMs: number;
};

export type RuntimeIncidentType =
  | "heartbeat_missed"
  | "runtime_unhealthy"
  | "runtime_offline"
  | "failover_triggered"
  | "failover_unavailable"
  | "runtime_recovered"
  | "maintenance_entered"
  | "maintenance_exited"
  | "manual_override_applied"
  | "manual_override_cleared";

export type RuntimeIncidentSeverity = "info" | "warning" | "critical";

export type RuntimeOperationalIncident = {
  id: string;
  runtimeId: string;
  type: RuntimeIncidentType;
  severity: RuntimeIncidentSeverity;
  timestamp: string;
  actorId: string | null;
  source: string;
  reason: string;
  relatedRuntimeId: string | null;
  metadata: Record<string, unknown>;
};

export type RuntimeMaintenanceMeta = {
  active: boolean;
  reason: string | null;
  scheduledAt: string | null;
  enteredAt: string | null;
  exitedAt: string | null;
  actorId: string | null;
};

export type RuntimeOverrideMode =
  | "force_unhealthy"
  | "force_ready"
  | "block_failover"
  | "pin_primary";

export type RuntimeManualOverride = {
  active: boolean;
  mode: RuntimeOverrideMode | null;
  reason: string | null;
  actorId: string | null;
  appliedAt: string | null;
};

export type RuntimeOpsState = {
  maintenance: RuntimeMaintenanceMeta;
  override: RuntimeManualOverride;
  activeFailoverTargetId: string | null;
  lastFailoverAt: string | null;
  lastFailoverFromId: string | null;
  cooldownUntil: string | null;
  healthyObservationCount: number;
  retryCount: number;
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
  ops: RuntimeOpsState;
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
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastHeartbeatAt: string | null;
  activeIncident: RuntimeOperationalIncident | null;
  activeFailoverTargetId: string | null;
  cooldownUntil: string | null;
  maintenanceActive: boolean;
  overrideActive: boolean;
  recentIncidents: RuntimeOperationalIncident[];
  allowedOpsActions: string[];
};

/** Inference request lifecycle — contracts only, no model execution. */
export type InferenceRequestLifecycle =
  | "pending"
  | "validated"
  | "accepted"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected"
  | "timed_out";

export type InferenceRequester = {
  actorId: string | null;
  role: string;
  tenantId: string;
  sessionId: string | null;
};

export type InferenceStructuredOutputContract = {
  mode: "none" | "json" | "schema";
  schemaId: string | null;
  schemaVersion: string | null;
  validateOutput: boolean;
};

export type InferenceStreamingContract = {
  enabled: boolean;
  streamId: string | null;
  chunkSequenceStart: number;
  completionMarker: string;
  cancellationSupported: boolean;
  backpressureHint: "none" | "slow_consumer" | "buffer_limit";
  maxBufferedChunks: number | null;
};

export type InferenceRetryMetadata = {
  attempt: number;
  maxAttempts: number;
  retryDelayMs: number;
  lastRetryAt: string | null;
};

export type InferenceFailureClass =
  | "none"
  | "validation"
  | "authorization"
  | "timeout"
  | "cancelled"
  | "runtime"
  | "unknown";

export type InferenceRequestMetrics = {
  createdAt: string;
  validatedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  failureClass: InferenceFailureClass;
};

export type InferenceRequestPayload = {
  prompt: string;
  inputKind: "text" | "messages" | "empty";
  messageCount: number;
};

export type InferenceRequestRecord = {
  requestId: string;
  capabilityId: AiCapabilityId;
  providerId: string | null;
  runtimeId: string | null;
  modelId: string | null;
  requester: InferenceRequester;
  correlationId: string;
  priority: number;
  costTier: RuntimeCostTier;
  timeoutMs: number;
  maxTokens: number | null;
  streaming: InferenceStreamingContract;
  structuredOutput: InferenceStructuredOutputContract;
  cancellationRequested: boolean;
  retry: InferenceRetryMetadata;
  lifecycle: InferenceRequestLifecycle;
  payload: InferenceRequestPayload;
  validationErrors: string[];
  rejectionReason: string | null;
  failureReason: string | null;
  auditEntryId: string | null;
  metrics: InferenceRequestMetrics;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedPrivateAiState = {
  schemaVersion: 5;
  updatedAt: string;
  models: PrivateModelRecord[];
  capabilities: CapabilityRecord[];
  hardwareContracts: HardwareContract[];
  deploymentProfiles: DeploymentProfile[];
  routingContracts: RoutingContract[];
  permissions: PrivateAiPermission[];
  auditTrail: PrivateAiAuditTrailEntry[];
  runtimes: PrivateAiRuntimeRecord[];
  runtimeIncidents: RuntimeOperationalIncident[];
  runtimeOpsPolicy: RuntimeOpsPolicy;
  inferenceRequests: InferenceRequestRecord[];
};
