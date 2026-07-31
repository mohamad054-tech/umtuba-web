/**
 * Private AI Foundation + Workflow + Deployment/Runtime + Inference Request Contracts.
 * Does not train, fine-tune, download weights, run inference engines, or ping hosts.
 */

import { createPrivateAiAuditEntry } from "./audit";
import { buildCapabilityRegistry } from "./capabilities";
import { DEPLOYMENT_PROFILES } from "./deploymentProfiles";
import {
  assertTransitionDeploymentState,
  listAllowedDeploymentTransitions,
} from "./deploymentState";
import {
  emptyPrivateAiState,
  readPersistedPrivateAiState,
  resolvePrivateAiDataDir,
  writePersistedPrivateAiState,
} from "./fileStore";
import { HARDWARE_CONTRACTS } from "./hardwareContracts";
import {
  assertTransitionPrivateAiLifecycle,
  listAllowedPrivateAiTransitions,
  transitionRequiresReason,
  workflowActionForTransition,
} from "./lifecycle";
import {
  createPrivateAiPermission,
  DEFAULT_PLATFORM_ADMIN_ACTIONS,
  hasModelLifecyclePermission,
  hasPermission,
  hasRuntimeOpsPermission,
} from "./permissions";
import {
  evaluatePrivateAiReadiness,
  readinessRequiredForTransition,
} from "./readiness";
import { buildRuntimeDiagnostics } from "./runtimeDiagnostics";
import {
  applyRuntimeHealthEvent,
  createEmptyRuntimeHealth,
} from "./runtimeHealth";
import {
  advanceAdapterLifecycle,
  lookupAdapterById,
  registerProviderAdapter,
  resolveAdapterForNegotiation,
} from "./adapterRegistry";
import {
  createContractTestAdapter,
  createExternalContractAdapter,
} from "./contractTestAdapter";
import {
  dispatchInferenceExecution,
  type DispatchExecutionInput,
} from "./executionDispatcher";
import {
  DEFAULT_EXECUTION_POLICY,
  DEFAULT_EXECUTION_QUOTA,
  resolveExecutionPolicy,
  resolveExecutionQuota,
} from "./executionPolicy";
import { evaluateProviderRouting } from "./providerRoutingEngine";
import {
  DEFAULT_PROVIDER_ROUTING_POLICY,
  resolveProviderRoutingPolicy,
} from "./providerRoutingPolicy";
import {
  ensureInferenceRequestDefaults,
  handleAdvanceInferenceRequest,
  handleCancelInferenceRequest,
  handleCreateInferenceRequest,
  handleRetryInferenceMetadata,
  handleTimeoutInferenceRequest,
  handleValidateInferenceRequest,
} from "./inferenceRequestHandlers";
import {
  ensureRuntimeOpsDefaults,
  handleApplyOverride,
  handleClearOverride,
  handleEnterMaintenance,
  handleEvaluateFailureDetection,
  handleExitMaintenance,
  handleMarkRecovered,
  handleMarkUnhealthy,
  handleRecordHeartbeat,
  handleRecordSuccessObservation,
  handleTriggerFailover,
} from "./runtimeOpsHandlers";
import { DEFAULT_RUNTIME_OPS_POLICY } from "./runtimeOpsPolicy";
import { createEmptyRuntimeOpsState } from "./runtimeOpsState";
import {
  evaluateRuntimeReadiness,
  runtimeMayBecomeDeploymentReady,
} from "./runtimeReadiness";
import { selectPrivateAiRuntime } from "./runtimeSelection";
import {
  assertRoutingContractShape,
  buildDefaultRoutingContracts,
} from "./routingContracts";
import { buildPrivateAiSeedState } from "./seed";
import type {
  AiCapabilityId,
  DeploymentProfileId,
  ExecutionBudgetContract,
  ExecutionPlanRecord,
  ExecutionPolicy,
  ExecutionQuotaContract,
  InferenceFailureClass,
  InferenceRequestLifecycle,
  InferenceRequestRecord,
  InferenceRequester,
  InferenceStructuredOutputContract,
  InferenceStreamingContract,
  ModelFamilyKind,
  PersistedPrivateAiState,
  PrivateAiAuditTrailEntry,
  PrivateAiDeploymentState,
  PrivateAiLifecycle,
  PrivateAiPermission,
  PrivateAiReadinessResult,
  PrivateAiRuntimeRecord,
  PrivateAiRuntimeState,
  PrivateModelClass,
  PrivateModelRecord,
  RuntimeCostTier,
  RuntimeDiagnosticRow,
  RuntimeOperationalIncident,
  RuntimeOpsPolicy,
  RuntimeOverrideMode,
  RuntimeReadinessResult,
  AdapterLifecycle,
  AdapterNegotiationRequest,
  NormalizedAdapterError,
  ProviderAdapterContract,
  ProviderCatalogEntry,
  ProviderRoutingCriteria,
  ProviderRoutingPolicy,
  ProviderRoutingResult,
  RuntimeSelectionCriteria,
  RuntimeSelectionResult,
} from "./types";

export type RegisterPrivateModelInput = {
  id: string;
  name: string;
  modelClass: PrivateModelClass;
  family: ModelFamilyKind;
  version: string;
  capabilities?: AiCapabilityId[];
  lifecycle?: PrivateAiLifecycle;
  deploymentProfileIds?: DeploymentProfileId[];
  hardwareContractId?: string | null;
  routingContractIds?: string[];
  providerHint?: string | null;
  architecture?: string;
  notes?: string;
  actorId?: string | null;
  actorRole?: string;
  now?: string;
};

export type AdvanceLifecycleInput = {
  modelId: string;
  to: PrivateAiLifecycle;
  actorId?: string | null;
  actorRole?: string;
  reason?: string | null;
  now?: string;
};

export type RegisterRuntimeInput = {
  id: string;
  modelId: string;
  label: string;
  providerHint?: string | null;
  region?: string | null;
  costTier?: RuntimeCostTier;
  priority?: number;
  capabilityIds?: AiCapabilityId[];
  hardwareContractId?: string | null;
  deploymentProfileId?: DeploymentProfileId | null;
  routingContractIds?: string[];
  failoverRuntimeIds?: string[];
  notes?: string;
  now?: string;
};

export type AdvanceDeploymentInput = {
  runtimeId: string;
  to: PrivateAiDeploymentState;
  actorRole?: string;
  now?: string;
};

export type PrivateAiService = {
  getState(): PersistedPrivateAiState;
  listModels(): PrivateModelRecord[];
  listCapabilities(): PersistedPrivateAiState["capabilities"];
  listHardware(): PersistedPrivateAiState["hardwareContracts"];
  listDeployments(): PersistedPrivateAiState["deploymentProfiles"];
  listRouting(): PersistedPrivateAiState["routingContracts"];
  listPermissions(): PrivateAiPermission[];
  listAuditTrail(): PrivateAiAuditTrailEntry[];
  listRuntimes(): PrivateAiRuntimeRecord[];
  getRuntime(id: string): PrivateAiRuntimeRecord | null;
  getModel(id: string): PrivateModelRecord | null;
  evaluateReadiness(modelId: string): PrivateAiReadinessResult;
  evaluateRuntimeReadiness(runtimeId: string): RuntimeReadinessResult;
  listAllowedTransitions(modelId: string): PrivateAiLifecycle[];
  listAllowedDeploymentTransitions(
    runtimeId: string
  ): PrivateAiDeploymentState[];
  registerModel(input: RegisterPrivateModelInput): PrivateModelRecord;
  registerRuntime(input: RegisterRuntimeInput): PrivateAiRuntimeRecord;
  mapCapabilityToModel(input: {
    capabilityId: AiCapabilityId;
    modelId: string;
    now?: string;
  }): void;
  advanceLifecycle(input: AdvanceLifecycleInput): PrivateModelRecord;
  advanceDeployment(input: AdvanceDeploymentInput): PrivateAiRuntimeRecord;
  recordRuntimeHealth(input: {
    runtimeId: string;
    kind: "heartbeat" | "success" | "failure";
    reason?: string | null;
    at?: string;
  }): PrivateAiRuntimeRecord;
  setRuntimeState(input: {
    runtimeId: string;
    runtimeState: PrivateAiRuntimeState;
    now?: string;
  }): PrivateAiRuntimeRecord;
  selectRuntime(criteria: RuntimeSelectionCriteria): RuntimeSelectionResult;
  listRuntimeDiagnostics(): RuntimeDiagnosticRow[];
  listRuntimeIncidents(runtimeId?: string): RuntimeOperationalIncident[];
  getRuntimeOpsPolicy(): RuntimeOpsPolicy;
  recordHeartbeat(input: {
    runtimeId: string;
    source?: string;
    status?: "healthy" | "degraded" | "unhealthy" | "unknown";
    latencyMs?: number | null;
    actorRole?: string;
    at?: string;
  }): PrivateAiRuntimeRecord;
  evaluateFailureDetection(
    runtimeId: string,
    now?: string
  ): {
    runtime: PrivateAiRuntimeRecord;
    detection: ReturnType<typeof handleEvaluateFailureDetection>["detection"];
  };
  markRuntimeUnhealthy(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    now?: string;
  }): PrivateAiRuntimeRecord;
  enterMaintenance(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    scheduledAt?: string | null;
    now?: string;
  }): PrivateAiRuntimeRecord;
  exitMaintenance(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    now?: string;
  }): PrivateAiRuntimeRecord;
  triggerFailover(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    criteria?: Partial<RuntimeSelectionCriteria>;
    now?: string;
  }): {
    source: PrivateAiRuntimeRecord;
    target: PrivateAiRuntimeRecord | null;
    ok: boolean;
    reason: string;
  };
  markRuntimeRecovered(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    force?: boolean;
    now?: string;
  }): PrivateAiRuntimeRecord;
  recordHealthyObservation(input: {
    runtimeId: string;
    actorRole?: string;
    at?: string;
  }): PrivateAiRuntimeRecord;
  applyRuntimeOverride(input: {
    runtimeId: string;
    mode: RuntimeOverrideMode;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    now?: string;
  }): PrivateAiRuntimeRecord;
  clearRuntimeOverride(input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    actorRole?: string;
    now?: string;
  }): PrivateAiRuntimeRecord;
  listInferenceRequests(): InferenceRequestRecord[];
  getInferenceRequest(requestId: string): InferenceRequestRecord | null;
  createInferenceRequest(input: {
    requestId?: string;
    capabilityId: AiCapabilityId;
    providerId?: string | null;
    runtimeId?: string | null;
    modelId?: string | null;
    requester: InferenceRequester;
    correlationId?: string;
    priority?: number;
    costTier?: RuntimeCostTier;
    timeoutMs?: number;
    maxTokens?: number | null;
    prompt?: string;
    inputKind?: "text" | "messages" | "empty";
    messageCount?: number;
    streaming?: Partial<InferenceStreamingContract>;
    structuredOutput?: Partial<InferenceStructuredOutputContract>;
    maxAttempts?: number;
    retryDelayMs?: number;
    notes?: string;
    now?: string;
    autoSelectRuntime?: boolean;
  }): InferenceRequestRecord;
  validateInferenceRequest(requestId: string, now?: string): InferenceRequestRecord;
  advanceInferenceRequest(input: {
    requestId: string;
    to: InferenceRequestLifecycle;
    reason?: string | null;
    now?: string;
    failureClass?: InferenceFailureClass;
  }): InferenceRequestRecord;
  cancelInferenceRequest(input: {
    requestId: string;
    reason?: string;
    now?: string;
  }): InferenceRequestRecord;
  timeoutInferenceRequest(input: {
    requestId: string;
    now?: string;
  }): InferenceRequestRecord;
  retryInferenceRequest(input: {
    requestId: string;
    now?: string;
  }): InferenceRequestRecord;
  listExecutionPlans(): ExecutionPlanRecord[];
  getExecutionPlan(planId: string): ExecutionPlanRecord | null;
  getExecutionPolicy(): ExecutionPolicy;
  getExecutionQuota(): ExecutionQuotaContract;
  dispatchExecution(input: DispatchExecutionInput & {
    budget?: Partial<ExecutionBudgetContract>;
  }): ExecutionPlanRecord;
  getProviderRoutingPolicy(): ProviderRoutingPolicy;
  listProviderCatalog(): ProviderCatalogEntry[];
  listProviderRoutingEvaluations(): ProviderRoutingResult[];
  evaluateProviderRouting(
    criteria: ProviderRoutingCriteria
  ): ProviderRoutingResult;
  updateProviderRoutingPolicy(
    patch: Partial<ProviderRoutingPolicy>
  ): ProviderRoutingPolicy;
  listProviderAdapters(): ProviderAdapterContract[];
  getProviderAdapter(adapterId: string): ProviderAdapterContract | null;
  registerProviderAdapter(adapter: ProviderAdapterContract): ProviderAdapterContract;
  advanceAdapterLifecycle(input: {
    adapterId: string;
    to: AdapterLifecycle;
    now?: string;
  }): ProviderAdapterContract;
  negotiateAdapter(req: AdapterNegotiationRequest): ReturnType<
    typeof resolveAdapterForNegotiation
  >;
  listAdapterNormalizedFailures(): NormalizedAdapterError[];
  checkPermission(input: {
    scope: PrivateAiPermission["scope"];
    resourceId: string;
    role: string;
    action: string;
  }): boolean;
  persist(): void;
};

export function createPrivateAiService(options?: {
  dataDir?: string;
  ephemeral?: boolean;
  seed?: boolean;
}): PrivateAiService {
  const dataDir = resolvePrivateAiDataDir(options?.dataDir);
  const now0 = new Date().toISOString();
  const emptyWithCatalog = (): PersistedPrivateAiState =>
    ensureRuntimeOpsDefaults({
      ...emptyPrivateAiState(now0),
      capabilities: buildCapabilityRegistry(now0),
      hardwareContracts: [...HARDWARE_CONTRACTS],
      deploymentProfiles: [...DEPLOYMENT_PROFILES],
      routingContracts: buildDefaultRoutingContracts(),
      runtimeOpsPolicy: { ...DEFAULT_RUNTIME_OPS_POLICY },
      runtimeIncidents: [],
      executionPlans: [],
      executionPolicy: { ...DEFAULT_EXECUTION_POLICY },
      executionQuota: { ...DEFAULT_EXECUTION_QUOTA },
      providerRoutingPolicy: { ...DEFAULT_PROVIDER_ROUTING_POLICY },
      providerRoutingEvaluations: [],
      providerAdapters: [
        createExternalContractAdapter(now0),
        createContractTestAdapter(now0),
      ],
      adapterNormalizedFailures: [],
      permissions: [
        createPrivateAiPermission({
          id: "perm_admin_models",
          scope: "model",
          resourceId: "*",
          role: "platform_admin",
          actions: [...DEFAULT_PLATFORM_ADMIN_ACTIONS],
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
          id: "perm_reviewer_models",
          scope: "model",
          resourceId: "*",
          role: "model_reviewer",
          actions: ["read", "request_changes", "reject", "approve"],
          granted: true,
        }),
      ],
    });
  let state: PersistedPrivateAiState = options?.ephemeral
    ? options.seed === false
      ? emptyWithCatalog()
      : buildPrivateAiSeedState(now0)
    : readPersistedPrivateAiState(dataDir) ??
      (options?.seed === false
        ? emptyWithCatalog()
        : buildPrivateAiSeedState(now0));

  state = ensureInferenceRequestDefaults(ensureRuntimeOpsDefaults(state));
  state = {
    ...state,
    schemaVersion: 8,
    executionPolicy: resolveExecutionPolicy(state.executionPolicy),
    executionQuota: resolveExecutionQuota(state.executionQuota),
    executionPlans: state.executionPlans ?? [],
    providerRoutingPolicy: resolveProviderRoutingPolicy(
      state.providerRoutingPolicy
    ),
    providerRoutingEvaluations: state.providerRoutingEvaluations ?? [],
    providerAdapters:
      state.providerAdapters?.length
        ? state.providerAdapters
        : [
            createExternalContractAdapter(now0),
            createContractTestAdapter(now0),
          ],
    adapterNormalizedFailures: state.adapterNormalizedFailures ?? [],
  };

  const persist = () => {
    if (options?.ephemeral) return;
    writePersistedPrivateAiState(dataDir, state);
  };

  const requireOps = (
    runtime: PrivateAiRuntimeRecord,
    role: string,
    action: string
  ) => {
    if (
      !hasRuntimeOpsPermission(state.permissions, {
        role,
        modelId: runtime.modelId,
        action,
      })
    ) {
      throw new Error(
        `Permission denied for ${role} to ${action} on ${runtime.id}`
      );
    }
  };

  const service: PrivateAiService = {
    getState: () => state,
    listModels: () => [...state.models],
    listCapabilities: () => [...state.capabilities],
    listHardware: () => [...state.hardwareContracts],
    listDeployments: () => [...state.deploymentProfiles],
    listRouting: () => [...state.routingContracts],
    listPermissions: () => [...state.permissions],
    listAuditTrail: () => [...state.auditTrail],
    listRuntimes: () => [...state.runtimes],
    getRuntime: (id) => state.runtimes.find((r) => r.id === id) ?? null,
    getModel: (id) => state.models.find((m) => m.id === id) ?? null,

    evaluateReadiness(modelId) {
      const model = state.models.find((m) => m.id === modelId);
      if (!model) throw new Error(`Unknown model: ${modelId}`);
      return evaluatePrivateAiReadiness(model, state);
    },

    evaluateRuntimeReadiness(runtimeId) {
      const runtime = state.runtimes.find((r) => r.id === runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);
      return evaluateRuntimeReadiness(runtime, state);
    },

    listAllowedTransitions(modelId) {
      const model = state.models.find((m) => m.id === modelId);
      if (!model) throw new Error(`Unknown model: ${modelId}`);
      return listAllowedPrivateAiTransitions(model.lifecycle);
    },

    listAllowedDeploymentTransitions(runtimeId) {
      const runtime = state.runtimes.find((r) => r.id === runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);
      return listAllowedDeploymentTransitions(runtime.deploymentState);
    },

    registerModel(input) {
      if (state.models.some((m) => m.id === input.id)) {
        throw new Error(`Model already registered: ${input.id}`);
      }
      if (input.modelClass === "archived") {
        throw new Error("Cannot register directly as archived");
      }
      if (input.lifecycle && input.lifecycle !== "draft") {
        throw new Error("New models must start in draft");
      }
      const now = input.now ?? new Date().toISOString();
      const record: PrivateModelRecord = {
        id: input.id,
        name: input.name,
        modelClass: input.modelClass,
        family: input.family,
        version: input.version,
        capabilities: input.capabilities ?? [],
        lifecycle: "draft",
        deploymentProfileIds: input.deploymentProfileIds ?? ["development"],
        hardwareContractId: input.hardwareContractId ?? null,
        routingContractIds: input.routingContractIds ?? [],
        providerHint: input.providerHint ?? null,
        architecture: input.architecture ?? "registry-placeholder",
        notes: input.notes ?? "No weights. No training. No inference.",
        reviewReason: null,
        createdAt: now,
        updatedAt: now,
      };
      const audit = createPrivateAiAuditEntry({
        action: "register",
        actorId: input.actorId,
        actorRole: input.actorRole ?? null,
        previousState: null,
        newState: "draft",
        modelId: record.id,
        now,
      });
      state = {
        ...state,
        models: [...state.models, record],
        auditTrail: [...state.auditTrail, audit],
        updatedAt: now,
      };
      persist();
      return record;
    },

    mapCapabilityToModel(input) {
      const model = state.models.find((m) => m.id === input.modelId);
      if (!model) throw new Error(`Unknown model: ${input.modelId}`);
      const cap = state.capabilities.find((c) => c.id === input.capabilityId);
      if (!cap) throw new Error(`Unknown capability: ${input.capabilityId}`);
      const now = input.now ?? new Date().toISOString();
      const capabilities = [
        ...new Set([...model.capabilities, input.capabilityId]),
      ];
      const mappedModelIds = [...new Set([...cap.mappedModelIds, model.id])];
      state = {
        ...state,
        models: state.models.map((m) =>
          m.id === model.id ? { ...m, capabilities, updatedAt: now } : m
        ),
        capabilities: state.capabilities.map((c) =>
          c.id === cap.id ? { ...c, mappedModelIds, updatedAt: now } : c
        ),
        updatedAt: now,
      };
      persist();
    },

    advanceLifecycle(input) {
      const model = state.models.find((m) => m.id === input.modelId);
      if (!model) throw new Error(`Unknown model: ${input.modelId}`);

      const role = input.actorRole ?? "platform_admin";
      const action = workflowActionForTransition(input.to);
      if (
        !hasModelLifecyclePermission(state.permissions, {
          role,
          modelId: model.id,
          action,
        })
      ) {
        throw new Error(
          `Permission denied for ${role} to ${action} on ${model.id}`
        );
      }

      assertTransitionPrivateAiLifecycle(model.lifecycle, input.to);

      if (model.lifecycle === input.to) {
        return model;
      }

      if (transitionRequiresReason(input.to)) {
        const reason = input.reason?.trim() ?? "";
        if (!reason) {
          throw new Error(`Reason required for transition to ${input.to}`);
        }
      }

      if (readinessRequiredForTransition(input.to)) {
        const gate = evaluatePrivateAiReadiness(model, state);
        if (!gate.ready) {
          throw new Error(
            `Readiness gate blocked ${input.to}: ${gate.blockers.join(",")}`
          );
        }
      }

      const now = input.now ?? new Date().toISOString();
      const modelClass: PrivateModelClass =
        input.to === "retired" ? "archived" : model.modelClass;
      const reviewReason =
        input.to === "changes_requested" || input.to === "rejected"
          ? (input.reason?.trim() ?? null)
          : input.to === "submitted_for_review" ||
              input.to === "approved" ||
              input.to === "active"
            ? null
            : model.reviewReason;

      const updated: PrivateModelRecord = {
        ...model,
        lifecycle: input.to,
        modelClass,
        reviewReason,
        updatedAt: now,
      };

      const audit = createPrivateAiAuditEntry({
        action,
        actorId: input.actorId,
        actorRole: role,
        reason: input.reason ?? null,
        previousState: model.lifecycle,
        newState: input.to,
        modelId: model.id,
        detail: {
          readinessChecked: readinessRequiredForTransition(input.to),
        },
        now,
      });

      state = {
        ...state,
        models: state.models.map((m) =>
          m.id === updated.id ? updated : m
        ),
        auditTrail: [...state.auditTrail, audit],
        updatedAt: now,
      };
      persist();
      return updated;
    },

    registerRuntime(input) {
      if (state.runtimes.some((r) => r.id === input.id)) {
        throw new Error(`Runtime already registered: ${input.id}`);
      }
      const model = state.models.find((m) => m.id === input.modelId);
      if (!model) throw new Error(`Unknown model: ${input.modelId}`);
      const now = input.now ?? new Date().toISOString();
      const record: PrivateAiRuntimeRecord = {
        id: input.id,
        modelId: input.modelId,
        label: input.label,
        providerHint: input.providerHint ?? model.providerHint,
        region: input.region ?? null,
        costTier: input.costTier ?? "standard",
        priority: input.priority ?? 100,
        deploymentState: "pending",
        runtimeState: "registered",
        capabilityIds: input.capabilityIds ?? [...model.capabilities],
        hardwareContractId:
          input.hardwareContractId ?? model.hardwareContractId,
        deploymentProfileId: input.deploymentProfileId ?? null,
        routingContractIds:
          input.routingContractIds ?? [...model.routingContractIds],
        availability: "unknown",
        health: createEmptyRuntimeHealth(),
        failoverRuntimeIds: input.failoverRuntimeIds ?? [],
        ops: createEmptyRuntimeOpsState(),
        notes:
          input.notes ??
          "Runtime contract only — no inference, no live probes.",
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        runtimes: [...state.runtimes, record],
        updatedAt: now,
      };
      persist();
      return record;
    },

    advanceDeployment(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);

      const role = input.actorRole ?? "platform_admin";
      if (
        !hasPermission(state.permissions, {
          scope: "model",
          resourceId: runtime.modelId,
          role,
          action: "deployment_update",
        }) &&
        !hasPermission(state.permissions, {
          scope: "model",
          resourceId: "*",
          role,
          action: "deployment_update",
        }) &&
        !hasPermission(state.permissions, {
          scope: "model",
          resourceId: "*",
          role,
          action: "lifecycle_update",
        })
      ) {
        throw new Error(
          `Permission denied for ${role} to update deployment on ${runtime.id}`
        );
      }

      assertTransitionDeploymentState(runtime.deploymentState, input.to);
      if (runtime.deploymentState === input.to) return runtime;

      if (input.to === "ready") {
        const gate = runtimeMayBecomeDeploymentReady(runtime, state);
        if (!gate.ready) {
          throw new Error(
            `Runtime readiness blocked ready: ${gate.blockers.join(",")}`
          );
        }
      }

      const now = input.now ?? new Date().toISOString();
      const runtimeState: PrivateAiRuntimeState =
        input.to === "ready"
          ? "running"
          : input.to === "unhealthy"
            ? "degraded"
            : input.to === "offline" || input.to === "retired"
              ? "stopped"
              : input.to === "provisioning"
                ? "starting"
                : runtime.runtimeState;

      const updated: PrivateAiRuntimeRecord = {
        ...runtime,
        deploymentState: input.to,
        runtimeState,
        availability:
          input.to === "ready"
            ? "available"
            : input.to === "unhealthy"
              ? "degraded"
              : input.to === "offline" ||
                  input.to === "retired" ||
                  input.to === "maintenance"
                ? "unavailable"
                : runtime.availability,
        updatedAt: now,
      };

      state = {
        ...state,
        runtimes: state.runtimes.map((r) =>
          r.id === updated.id ? updated : r
        ),
        updatedAt: now,
      };
      persist();
      return updated;
    },

    recordRuntimeHealth(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      const health = applyRuntimeHealthEvent(runtime.health, {
        kind: input.kind,
        at: input.at,
        reason: input.reason,
      });
      const now = input.at ?? new Date().toISOString();
      const updated: PrivateAiRuntimeRecord = {
        ...runtime,
        health,
        availability: health.availability,
        runtimeState:
          health.status === "unhealthy"
            ? "failed"
            : health.status === "degraded"
              ? "degraded"
              : health.status === "healthy"
                ? "running"
                : runtime.runtimeState,
        deploymentState:
          health.status === "unhealthy" && runtime.deploymentState === "ready"
            ? "unhealthy"
            : runtime.deploymentState,
        ops: {
          ...runtime.ops,
          healthyObservationCount:
            input.kind === "success"
              ? runtime.ops.healthyObservationCount + 1
              : runtime.ops.healthyObservationCount,
        },
        updatedAt: now,
      };
      state = {
        ...state,
        runtimes: state.runtimes.map((r) =>
          r.id === updated.id ? updated : r
        ),
        updatedAt: now,
      };
      persist();
      return updated;
    },

    setRuntimeState(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      const now = input.now ?? new Date().toISOString();
      const updated: PrivateAiRuntimeRecord = {
        ...runtime,
        runtimeState: input.runtimeState,
        updatedAt: now,
      };
      state = {
        ...state,
        runtimes: state.runtimes.map((r) =>
          r.id === updated.id ? updated : r
        ),
        updatedAt: now,
      };
      persist();
      return updated;
    },

    selectRuntime(criteria) {
      return selectPrivateAiRuntime(state, criteria);
    },

    listRuntimeDiagnostics() {
      return buildRuntimeDiagnostics(state);
    },

    listRuntimeIncidents(runtimeId) {
      const all = state.runtimeIncidents ?? [];
      if (!runtimeId) return [...all];
      return all.filter((i) => i.runtimeId === runtimeId);
    },

    getRuntimeOpsPolicy() {
      return { ...resolvePolicy() };
    },

    recordHeartbeat(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "heartbeat_record"
      );
      const result = handleRecordHeartbeat(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    evaluateFailureDetection(runtimeId, now) {
      const result = handleEvaluateFailureDetection(state, runtimeId, now);
      state = result.state;
      persist();
      return { runtime: result.runtime, detection: result.detection };
    },

    markRuntimeUnhealthy(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "runtime_operate"
      );
      const result = handleMarkUnhealthy(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    enterMaintenance(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "maintenance_manage"
      );
      const result = handleEnterMaintenance(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    exitMaintenance(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "maintenance_manage"
      );
      const result = handleExitMaintenance(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    triggerFailover(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "failover_trigger"
      );
      const beforeIncidents = (state.runtimeIncidents ?? []).length;
      const result = handleTriggerFailover(state, input);
      state = result.state;
      // only persist; incidents already appended on success/fail inside handler
      void beforeIncidents;
      persist();
      return {
        source: result.source,
        target: result.target,
        ok: result.ok,
        reason: result.reason,
      };
    },

    markRuntimeRecovered(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "runtime_recover"
      );
      const result = handleMarkRecovered(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    recordHealthyObservation(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "heartbeat_record"
      );
      const result = handleRecordSuccessObservation(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    applyRuntimeOverride(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "override_manage"
      );
      const result = handleApplyOverride(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    clearRuntimeOverride(input) {
      const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
      if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
      requireOps(
        runtime,
        input.actorRole ?? "platform_admin",
        "override_manage"
      );
      const result = handleClearOverride(state, input);
      state = result.state;
      persist();
      return result.runtime;
    },

    listInferenceRequests() {
      return [...(state.inferenceRequests ?? [])];
    },

    getInferenceRequest(requestId) {
      return (
        (state.inferenceRequests ?? []).find((r) => r.requestId === requestId) ??
        null
      );
    },

    createInferenceRequest(input) {
      const role = input.requester.role;
      const mayCreate =
        hasPermission(state.permissions, {
          scope: "capability",
          resourceId: input.capabilityId,
          role,
          action: "inference_request",
        }) ||
        hasPermission(state.permissions, {
          scope: "capability",
          resourceId: "*",
          role,
          action: "inference_request",
        }) ||
        hasPermission(state.permissions, {
          scope: "model",
          resourceId: "*",
          role,
          action: "inference_request",
        }) ||
        hasPermission(state.permissions, {
          scope: "model",
          resourceId: "*",
          role,
          action: "runtime_operate",
        });
      if (!mayCreate) {
        throw new Error(
          `Permission denied for ${role} to create inference request`
        );
      }
      const result = handleCreateInferenceRequest(state, input);
      state = result.state;
      persist();
      return result.request;
    },

    validateInferenceRequest(requestId, now) {
      const result = handleValidateInferenceRequest(state, requestId, now);
      state = result.state;
      persist();
      return result.request;
    },

    advanceInferenceRequest(input) {
      const result = handleAdvanceInferenceRequest(state, input);
      state = result.state;
      persist();
      return result.request;
    },

    cancelInferenceRequest(input) {
      const result = handleCancelInferenceRequest(state, input);
      state = result.state;
      persist();
      return result.request;
    },

    timeoutInferenceRequest(input) {
      const result = handleTimeoutInferenceRequest(state, input);
      state = result.state;
      persist();
      return result.request;
    },

    retryInferenceRequest(input) {
      const result = handleRetryInferenceMetadata(state, input);
      state = result.state;
      persist();
      return result.request;
    },

    listExecutionPlans() {
      return [...(state.executionPlans ?? [])];
    },

    getExecutionPlan(planId) {
      return (
        (state.executionPlans ?? []).find((p) => p.planId === planId) ?? null
      );
    },

    getExecutionPolicy() {
      return resolveExecutionPolicy(state.executionPolicy);
    },

    getExecutionQuota() {
      return resolveExecutionQuota(state.executionQuota);
    },

    dispatchExecution(input) {
      const result = dispatchInferenceExecution(state, input);
      const failure = result.plan.outputEnvelope?.failure ?? null;
      state = {
        ...state,
        schemaVersion: 8,
        executionPlans: [...(state.executionPlans ?? []), result.plan],
        auditTrail: [...state.auditTrail, ...result.auditEntries],
        adapterNormalizedFailures: failure
          ? [failure, ...(state.adapterNormalizedFailures ?? [])].slice(0, 100)
          : state.adapterNormalizedFailures ?? [],
        updatedAt: result.plan.updatedAt,
      };
      persist();
      return result.plan;
    },

    getProviderRoutingPolicy() {
      return resolveProviderRoutingPolicy(state.providerRoutingPolicy);
    },

    listProviderCatalog() {
      return [...resolveProviderRoutingPolicy(state.providerRoutingPolicy).providers];
    },

    listProviderRoutingEvaluations() {
      return [...(state.providerRoutingEvaluations ?? [])];
    },

    evaluateProviderRouting(criteria) {
      const result = evaluateProviderRouting(state, criteria);
      state = {
        ...state,
        schemaVersion: 8,
        providerRoutingEvaluations: [
          result,
          ...(state.providerRoutingEvaluations ?? []),
        ].slice(0, 100),
        updatedAt: result.evaluatedAt,
      };
      persist();
      return result;
    },

    updateProviderRoutingPolicy(patch) {
      const next = resolveProviderRoutingPolicy({
        ...resolveProviderRoutingPolicy(state.providerRoutingPolicy),
        ...patch,
      });
      state = {
        ...state,
        schemaVersion: 8,
        providerRoutingPolicy: next,
        updatedAt: new Date().toISOString(),
      };
      persist();
      return next;
    },

    listProviderAdapters() {
      return [...(state.providerAdapters ?? [])];
    },

    getProviderAdapter(adapterId) {
      return lookupAdapterById(state, adapterId);
    },

    registerProviderAdapter(adapter) {
      state = registerProviderAdapter(state, adapter);
      persist();
      return lookupAdapterById(state, adapter.adapterId)!;
    },

    advanceAdapterLifecycle(input) {
      state = advanceAdapterLifecycle(
        state,
        input.adapterId,
        input.to,
        input.now
      );
      persist();
      return lookupAdapterById(state, input.adapterId)!;
    },

    negotiateAdapter(req) {
      return resolveAdapterForNegotiation(state, req);
    },

    listAdapterNormalizedFailures() {
      return [...(state.adapterNormalizedFailures ?? [])];
    },

    checkPermission(input) {
      return hasPermission(state.permissions, input);
    },

    persist,
  };

  function resolvePolicy(): RuntimeOpsPolicy {
    return { ...DEFAULT_RUNTIME_OPS_POLICY, ...state.runtimeOpsPolicy };
  }

  for (const r of state.routingContracts) {
    const blockers = assertRoutingContractShape(r);
    if (blockers.length > 0) {
      throw new Error(
        `Invalid routing contract ${r.id}: ${blockers.join(",")}`
      );
    }
  }

  if (!options?.ephemeral && !readPersistedPrivateAiState(dataDir)) {
    persist();
  }

  return service;
}

let singleton: PrivateAiService | null = null;

export function getPrivateAiService(): PrivateAiService {
  if (!singleton) singleton = createPrivateAiService();
  return singleton;
}

export function resetPrivateAiForTests(): void {
  singleton = null;
}
