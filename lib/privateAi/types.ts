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

/** Execution boundary — plans only; never invokes providers/models. */
export type ExecutionPlanStatus =
  | "planned"
  | "queued"
  | "blocked"
  | "cancelled"
  | "failed_before_dispatch";

export type ExecutionPolicy = {
  requireReadyRuntime: boolean;
  requireApprovedModelLifecycle: boolean;
  requireInferencePermission: boolean;
  allowOfflineRuntime: boolean;
  maxTimeoutMs: number;
  defaultTimeoutMs: number;
};

export type ExecutionQuotaContract = {
  requestQuota: number;
  dailyQuota: number;
  tenantQuota: number;
  requestsUsed: number;
  dailyUsed: number;
  tenantUsed: number;
};

export type ExecutionBudgetContract = {
  tokenBudget: number | null;
  executionBudgetUnits: number;
  estimatedTokens: number | null;
  estimatedUnits: number;
};

export type ExecutionTimeoutContract = {
  timeoutMs: number;
  hardDeadlineAt: string | null;
};

export type ExecutionCancellationContract = {
  cancellationTokenId: string;
  cancellable: boolean;
  cancelRequested: boolean;
  cancelReason: string | null;
};

export type ExecutionErrorContract = {
  code: string;
  message: string;
  class:
    | "guard"
    | "authorization"
    | "quota"
    | "budget"
    | "timeout"
    | "cancellation"
    | "unknown";
  retriable: boolean;
};

export type ExecutionTraceMetadata = {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
};

export type ExecutionContext = {
  requestId: string;
  runtimeId: string;
  providerId: string;
  modelId: string;
  capabilityId: AiCapabilityId;
  tenantId: string;
  requester: InferenceRequester;
  correlationId: string;
  trace: ExecutionTraceMetadata;
  policy: ExecutionPolicy;
  timeout: ExecutionTimeoutContract;
  quota: ExecutionQuotaContract;
  budget: ExecutionBudgetContract;
  cancellation: ExecutionCancellationContract;
};

export type ExecutionSession = {
  sessionId: string;
  requestId: string;
  openedAt: string;
  closedAt: string | null;
  status: ExecutionPlanStatus;
};

export type ExecutionPlanRecord = {
  planId: string;
  requestId: string;
  status: ExecutionPlanStatus;
  context: ExecutionContext | null;
  session: ExecutionSession;
  guardErrors: string[];
  error: ExecutionErrorContract | null;
  selectedRuntimeId: string | null;
  /** Adapter boundary resolution (never a live provider call). */
  adapterResolution: AdapterResolutionResult | null;
  inputEnvelope: ExecutionInputEnvelope | null;
  outputEnvelope: ExecutionOutputEnvelope | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/** Provider Adapter Boundary — contracts only; no live inference. */
export type AdapterKind =
  | "contract_test"
  | "external_contract"
  | "private_contract"
  | "local_contract";

export type AdapterLifecycle =
  | "registered"
  | "validating"
  | "ready"
  | "degraded"
  | "unavailable"
  | "disabled"
  | "retired";

export type AdapterInputMode = "text" | "messages" | "empty";
export type AdapterOutputMode = "text" | "structured" | "empty";
export type AdapterRuntimeKind = "external" | "private" | "local" | "contract_test";

export type AdapterHealthMetadata = {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastCheckedAt: string | null;
  notes: string;
};

export type AdapterReadinessMetadata = {
  ready: boolean;
  blockers: string[];
  evaluatedAt: string | null;
};

export type ProviderAdapterContract = {
  adapterId: string;
  providerId: string;
  adapterKind: AdapterKind;
  version: string;
  lifecycle: AdapterLifecycle;
  enabled: boolean;
  /** Never true for contract_test in production paths. */
  productionEnabled: boolean;
  available: boolean;
  supportedCapabilities: AiCapabilityId[];
  supportedModels: string[];
  supportedRuntimeKinds: AdapterRuntimeKind[];
  supportedInputModes: AdapterInputMode[];
  supportedOutputModes: AdapterOutputMode[];
  supportsStreaming: boolean;
  supportsStructuredOutput: boolean;
  supportsCancellation: boolean;
  supportsTimeout: boolean;
  minPolicyVersion: string | null;
  maxPayloadBytes: number;
  health: AdapterHealthMetadata;
  readiness: AdapterReadinessMetadata;
  notes: string;
  registeredAt: string;
  updatedAt: string;
};

export type AdapterNegotiationRequest = {
  providerId?: string | null;
  capabilityId: AiCapabilityId;
  modelId?: string | null;
  runtimeKind?: AdapterRuntimeKind | null;
  requireStreaming?: boolean;
  requireStructuredOutput?: boolean;
  requireCancellation?: boolean;
  requireTimeout?: boolean;
  policyVersion?: string | null;
  allowContractTest?: boolean;
  now?: string;
};

export type AdapterRejection = {
  adapterId: string;
  providerId: string;
  reasons: string[];
};

export type AdapterNegotiationResult = {
  ok: boolean;
  selectedAdapterId: string | null;
  rejected: AdapterRejection[];
  reasons: string[];
  evaluatedAt: string;
};

export type AdapterResolutionResult = {
  ok: boolean;
  adapterId: string | null;
  providerId: string | null;
  negotiation: AdapterNegotiationResult;
  failureClass: AdapterFailureClass | null;
  retryable: boolean;
  auditEventId: string | null;
  notes: string;
};

export type AdapterFailureClass =
  | "adapter_unavailable"
  | "adapter_not_ready"
  | "capability_unsupported"
  | "model_unsupported"
  | "invalid_execution_input"
  | "timeout_before_execution"
  | "cancellation_before_execution"
  | "provider_rate_limited"
  | "provider_auth_failed"
  | "provider_unavailable"
  | "provider_rejected"
  | "malformed_provider_response"
  | "structured_output_invalid"
  | "internal_adapter_error"
  | "no_eligible_adapter";

export type NormalizedAdapterError = {
  class: AdapterFailureClass;
  code: string;
  safeMessage: string;
  retryable: boolean;
  adminDiagnostic: string;
  redacted: boolean;
};

export type ExecutionInputEnvelope = {
  requestId: string;
  executionPlanId: string;
  providerId: string;
  runtimeId: string;
  modelId: string;
  capabilityId: AiCapabilityId;
  adapterId: string;
  tenantId: string;
  requester: {
    actorId: string | null;
    role: string;
    tenantId: string;
    sessionId: string | null;
  };
  normalizedInput: {
    kind: AdapterInputMode;
    /** Redacted/summarized only — never secrets. */
    promptChars: number;
    messageCount: number;
    hasPrompt: boolean;
  };
  structuredOutput: InferenceStructuredOutputContract;
  streaming: InferenceStreamingContract;
  timeout: ExecutionTimeoutContract;
  cancellation: ExecutionCancellationContract;
  retry: InferenceRetryMetadata;
  correlationId: string;
  trace: ExecutionTraceMetadata;
  payloadBytesEstimate: number;
  maxPayloadBytes: number;
  redactionApplied: boolean;
  notes: string;
};

export type ExecutionOutputEnvelope = {
  status: "fixture_ok" | "fixture_error" | "not_executed" | "blocked";
  requestId: string;
  executionPlanId: string;
  providerId: string;
  runtimeId: string;
  modelId: string;
  adapterId: string | null;
  output: {
    kind: AdapterOutputMode;
    /** Fixture text only in tests — never live model output. */
    fixtureText: string | null;
    structuredValid: boolean | null;
  };
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  latencyMs: number | null;
  finishReason: string | null;
  retryable: boolean;
  failure: NormalizedAdapterError | null;
  providerSafeDiagnostic: string | null;
  correlationId: string;
  auditEventId: string | null;
  notes: string;
  createdAt: string;
};

/** Provider routing policy — selection only; never invokes providers. */
export type ProviderCatalogEntry = {
  id: string;
  label: string;
  /** Lower number = higher priority. */
  priority: number;
  capabilities: AiCapabilityId[];
  regions: string[];
  costTier: RuntimeCostTier;
  enabled: boolean;
  notes: string;
};

export type ProviderRoutingPolicy = {
  version: string;
  providers: ProviderCatalogEntry[];
  /** null = all non-blacklisted providers allowed */
  whitelist: string[] | null;
  blacklist: string[];
  preferredProviderId: string | null;
  fallbackProviderIds: string[];
  tenantPreferredProviders: Record<string, string>;
  manualOverrideProviderId: string | null;
  preferCostTier: RuntimeCostTier | null;
  /** Reject providers above this cost tier (budget policy). null = no max. */
  maxCostTier: RuntimeCostTier | null;
  preferRegion: string | null;
  respectMaintenance: boolean;
  respectCooldown: boolean;
  respectHealth: boolean;
  /** Suppress providers whose runtime recently failed over (ops window). */
  respectFailureSuppression: boolean;
  allowPremiumCost: boolean;
};

export type ProviderRoutingCriteria = {
  capabilityId: AiCapabilityId;
  tenantId?: string | null;
  region?: string | null;
  preferCostTier?: RuntimeCostTier | null;
  preferredProviderId?: string | null;
  now?: string;
};

export type ProviderRoutingRejection = {
  providerId: string;
  runtimeId: string | null;
  reasons: string[];
};

export type ProviderRoutingResult = {
  selectedProviderId: string | null;
  selectedRuntimeId: string | null;
  selectionReason: string;
  rejected: ProviderRoutingRejection[];
  fallbackChain: string[];
  policyVersion: string;
  confidence: number;
  evaluatedAt: string;
};

export type PersistedPrivateAiState = {
  schemaVersion: 8;
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
  executionPlans: ExecutionPlanRecord[];
  executionPolicy: ExecutionPolicy;
  executionQuota: ExecutionQuotaContract;
  providerRoutingPolicy: ProviderRoutingPolicy;
  providerRoutingEvaluations: ProviderRoutingResult[];
  /** Provider adapter registry — contracts only; no live SDKs. */
  providerAdapters: ProviderAdapterContract[];
  adapterNormalizedFailures: NormalizedAdapterError[];
};
