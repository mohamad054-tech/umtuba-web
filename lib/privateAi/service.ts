/**
 * Private AI Foundation service — registries and contracts only.
 * Does not train, fine-tune, download weights, or run inference.
 */

import { buildCapabilityRegistry } from "./capabilities";
import { DEPLOYMENT_PROFILES } from "./deploymentProfiles";
import {
  emptyPrivateAiState,
  readPersistedPrivateAiState,
  resolvePrivateAiDataDir,
  writePersistedPrivateAiState,
} from "./fileStore";
import { HARDWARE_CONTRACTS } from "./hardwareContracts";
import { assertTransitionPrivateAiLifecycle } from "./lifecycle";
import { hasPermission } from "./permissions";
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
  PrivateAiLifecycle,
  PrivateAiPermission,
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
  getModel(id: string): PrivateModelRecord | null;
  registerModel(input: RegisterPrivateModelInput): PrivateModelRecord;
  mapCapabilityToModel(input: {
    capabilityId: AiCapabilityId;
    modelId: string;
    now?: string;
  }): void;
  advanceLifecycle(input: {
    modelId: string;
    to: PrivateAiLifecycle;
    now?: string;
  }): PrivateModelRecord;
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
  let state: PersistedPrivateAiState = options?.ephemeral
    ? options.seed === false
      ? {
          ...emptyPrivateAiState(now0),
          capabilities: buildCapabilityRegistry(now0),
          hardwareContracts: [...HARDWARE_CONTRACTS],
          deploymentProfiles: [...DEPLOYMENT_PROFILES],
          routingContracts: buildDefaultRoutingContracts(),
        }
      : buildPrivateAiSeedState(now0)
    : readPersistedPrivateAiState(dataDir) ??
      (options?.seed === false
        ? {
            ...emptyPrivateAiState(now0),
            capabilities: buildCapabilityRegistry(now0),
            hardwareContracts: [...HARDWARE_CONTRACTS],
            deploymentProfiles: [...DEPLOYMENT_PROFILES],
            routingContracts: buildDefaultRoutingContracts(),
          }
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
    getModel: (id) => state.models.find((m) => m.id === id) ?? null,

    registerModel(input) {
      if (state.models.some((m) => m.id === input.id)) {
        throw new Error(`Model already registered: ${input.id}`);
      }
      if (input.modelClass === "archived") {
        throw new Error("Cannot register directly as archived");
      }
      const now = input.now ?? new Date().toISOString();
      const record: PrivateModelRecord = {
        id: input.id,
        name: input.name,
        modelClass: input.modelClass,
        family: input.family,
        version: input.version,
        capabilities: input.capabilities ?? [],
        lifecycle: input.lifecycle ?? "draft",
        deploymentProfileIds: input.deploymentProfileIds ?? ["development"],
        hardwareContractId: input.hardwareContractId ?? null,
        routingContractIds: input.routingContractIds ?? [],
        providerHint: input.providerHint ?? null,
        architecture: input.architecture ?? "registry-placeholder",
        notes: input.notes ?? "No weights. No training. No inference.",
        createdAt: now,
        updatedAt: now,
      };
      state = {
        ...state,
        models: [...state.models, record],
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
      assertTransitionPrivateAiLifecycle(model.lifecycle, input.to);
      const now = input.now ?? new Date().toISOString();
      const modelClass: PrivateModelClass =
        input.to === "archived" ? "archived" : model.modelClass;
      const updated: PrivateModelRecord = {
        ...model,
        lifecycle: input.to,
        modelClass,
        updatedAt: now,
      };
      state = {
        ...state,
        models: state.models.map((m) =>
          m.id === updated.id ? updated : m
        ),
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
