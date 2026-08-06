/**
 * Private AI Foundation + Workflow + Deployment/Runtime service.
 * Does not train, fine-tune, download weights, run inference, or ping hosts.
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
  RuntimeReadinessResult,
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
  const emptyWithCatalog = (): PersistedPrivateAiState => ({
    ...emptyPrivateAiState(now0),
    capabilities: buildCapabilityRegistry(now0),
    hardwareContracts: [...HARDWARE_CONTRACTS],
    deploymentProfiles: [...DEPLOYMENT_PROFILES],
    routingContracts: buildDefaultRoutingContracts(),
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

  if (!Array.isArray(state.runtimes)) {
    state = { ...state, schemaVersion: 3, runtimes: [] };
  }

  const persist = () => {
    if (options?.ephemeral) return;
    writePersistedPrivateAiState(dataDir, state);
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

    checkPermission(input) {
      return hasPermission(state.permissions, input);
    },

    persist,
  };

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
