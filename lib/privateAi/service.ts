/**
 * Private AI Foundation + Workflow service — registries and admin lifecycle.
 * Does not train, fine-tune, download weights, or run inference.
 */

import { createPrivateAiAuditEntry } from "./audit";
import { buildCapabilityRegistry } from "./capabilities";
import { DEPLOYMENT_PROFILES } from "./deploymentProfiles";
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
  PrivateAiLifecycle,
  PrivateAiPermission,
  PrivateAiReadinessResult,
  PrivateModelClass,
  PrivateModelRecord,
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

export type PrivateAiService = {
  getState(): PersistedPrivateAiState;
  listModels(): PrivateModelRecord[];
  listCapabilities(): PersistedPrivateAiState["capabilities"];
  listHardware(): PersistedPrivateAiState["hardwareContracts"];
  listDeployments(): PersistedPrivateAiState["deploymentProfiles"];
  listRouting(): PersistedPrivateAiState["routingContracts"];
  listPermissions(): PrivateAiPermission[];
  listAuditTrail(): PrivateAiAuditTrailEntry[];
  getModel(id: string): PrivateModelRecord | null;
  evaluateReadiness(modelId: string): PrivateAiReadinessResult;
  listAllowedTransitions(modelId: string): PrivateAiLifecycle[];
  registerModel(input: RegisterPrivateModelInput): PrivateModelRecord;
  mapCapabilityToModel(input: {
    capabilityId: AiCapabilityId;
    modelId: string;
    now?: string;
  }): void;
  advanceLifecycle(input: AdvanceLifecycleInput): PrivateModelRecord;
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
    getModel: (id) => state.models.find((m) => m.id === id) ?? null,

    evaluateReadiness(modelId) {
      const model = state.models.find((m) => m.id === modelId);
      if (!model) throw new Error(`Unknown model: ${modelId}`);
      return evaluatePrivateAiReadiness(model, state);
    },

    listAllowedTransitions(modelId) {
      const model = state.models.find((m) => m.id === modelId);
      if (!model) throw new Error(`Unknown model: ${modelId}`);
      return listAllowedPrivateAiTransitions(model.lifecycle);
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
