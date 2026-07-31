import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_EXECUTION_POLICY,
  DEFAULT_EXECUTION_QUOTA,
} from "./executionPolicy";
import { DEFAULT_PROVIDER_ROUTING_POLICY } from "./providerRoutingPolicy";
import { DEFAULT_RUNTIME_OPS_POLICY } from "./runtimeOpsPolicy";
import { createEmptyRuntimeOpsState } from "./runtimeOpsState";
import type {
  PersistedPrivateAiState,
  PrivateAiLifecycle,
  PrivateAiRuntimeRecord,
  PrivateModelRecord,
  RuntimeOpsState,
} from "./types";

export function resolvePrivateAiDataDir(override?: string): string {
  if (override) return override;
  if (process.env.UMTUBA_PRIVATE_AI_DATA_DIR) {
    return process.env.UMTUBA_PRIVATE_AI_DATA_DIR;
  }
  return join(process.cwd(), "data", "private-ai");
}

export function privateAiStorePath(dataDir: string): string {
  return join(dataDir, "registry.json");
}

export function emptyPrivateAiState(
  now = new Date().toISOString()
): PersistedPrivateAiState {
  return {
    schemaVersion: 7,
    updatedAt: now,
    models: [],
    capabilities: [],
    hardwareContracts: [],
    deploymentProfiles: [],
    routingContracts: [],
    permissions: [],
    auditTrail: [],
    runtimes: [],
    runtimeIncidents: [],
    runtimeOpsPolicy: { ...DEFAULT_RUNTIME_OPS_POLICY },
    inferenceRequests: [],
    executionPlans: [],
    executionPolicy: { ...DEFAULT_EXECUTION_POLICY },
    executionQuota: { ...DEFAULT_EXECUTION_QUOTA },
    providerRoutingPolicy: { ...DEFAULT_PROVIDER_ROUTING_POLICY },
    providerRoutingEvaluations: [],
  };
}

const LEGACY_LIFECYCLE_MAP: Record<string, PrivateAiLifecycle> = {
  draft: "draft",
  training_planned: "draft",
  training_running: "draft",
  evaluation: "draft",
  candidate: "submitted_for_review",
  approved: "approved",
  production: "active",
  deprecated: "deprecated",
  archived: "retired",
  submitted_for_review: "submitted_for_review",
  changes_requested: "changes_requested",
  rejected: "rejected",
  active: "active",
  retired: "retired",
};

function migrateModel(raw: Record<string, unknown>): PrivateModelRecord {
  const lifecycleRaw = String(raw.lifecycle ?? "draft");
  const lifecycle =
    LEGACY_LIFECYCLE_MAP[lifecycleRaw] ?? ("draft" as PrivateAiLifecycle);
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    modelClass: raw.modelClass as PrivateModelRecord["modelClass"],
    family: raw.family as PrivateModelRecord["family"],
    version: String(raw.version ?? ""),
    capabilities: Array.isArray(raw.capabilities)
      ? (raw.capabilities as PrivateModelRecord["capabilities"])
      : [],
    lifecycle,
    deploymentProfileIds: Array.isArray(raw.deploymentProfileIds)
      ? (raw.deploymentProfileIds as PrivateModelRecord["deploymentProfileIds"])
      : [],
    hardwareContractId:
      typeof raw.hardwareContractId === "string"
        ? raw.hardwareContractId
        : null,
    routingContractIds: Array.isArray(raw.routingContractIds)
      ? (raw.routingContractIds as string[])
      : [],
    providerHint:
      typeof raw.providerHint === "string" ? raw.providerHint : null,
    architecture: String(raw.architecture ?? ""),
    notes: String(raw.notes ?? ""),
    reviewReason:
      typeof raw.reviewReason === "string" ? raw.reviewReason : null,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function migrateOps(raw: unknown): RuntimeOpsState {
  const base = createEmptyRuntimeOpsState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const maint =
    o.maintenance && typeof o.maintenance === "object"
      ? (o.maintenance as Record<string, unknown>)
      : {};
  const ov =
    o.override && typeof o.override === "object"
      ? (o.override as Record<string, unknown>)
      : {};
  return {
    maintenance: {
      active: Boolean(maint.active),
      reason: typeof maint.reason === "string" ? maint.reason : null,
      scheduledAt: typeof maint.scheduledAt === "string" ? maint.scheduledAt : null,
      enteredAt: typeof maint.enteredAt === "string" ? maint.enteredAt : null,
      exitedAt: typeof maint.exitedAt === "string" ? maint.exitedAt : null,
      actorId: typeof maint.actorId === "string" ? maint.actorId : null,
    },
    override: {
      active: Boolean(ov.active),
      mode: (ov.mode as RuntimeOpsState["override"]["mode"]) ?? null,
      reason: typeof ov.reason === "string" ? ov.reason : null,
      actorId: typeof ov.actorId === "string" ? ov.actorId : null,
      appliedAt: typeof ov.appliedAt === "string" ? ov.appliedAt : null,
    },
    activeFailoverTargetId:
      typeof o.activeFailoverTargetId === "string"
        ? o.activeFailoverTargetId
        : null,
    lastFailoverAt:
      typeof o.lastFailoverAt === "string" ? o.lastFailoverAt : null,
    lastFailoverFromId:
      typeof o.lastFailoverFromId === "string" ? o.lastFailoverFromId : null,
    cooldownUntil: typeof o.cooldownUntil === "string" ? o.cooldownUntil : null,
    healthyObservationCount:
      typeof o.healthyObservationCount === "number"
        ? o.healthyObservationCount
        : 0,
    retryCount: typeof o.retryCount === "number" ? o.retryCount : 0,
  };
}

function migrateRuntime(raw: Record<string, unknown>): PrivateAiRuntimeRecord {
  const healthRaw =
    raw.health && typeof raw.health === "object"
      ? (raw.health as Record<string, unknown>)
      : {};
  return {
    id: String(raw.id ?? ""),
    modelId: String(raw.modelId ?? ""),
    label: String(raw.label ?? ""),
    providerHint:
      typeof raw.providerHint === "string" ? raw.providerHint : null,
    region: typeof raw.region === "string" ? raw.region : null,
    costTier: (raw.costTier as PrivateAiRuntimeRecord["costTier"]) ?? "standard",
    priority: typeof raw.priority === "number" ? raw.priority : 100,
    deploymentState:
      (raw.deploymentState as PrivateAiRuntimeRecord["deploymentState"]) ??
      "pending",
    runtimeState:
      (raw.runtimeState as PrivateAiRuntimeRecord["runtimeState"]) ??
      "unregistered",
    capabilityIds: Array.isArray(raw.capabilityIds)
      ? (raw.capabilityIds as PrivateAiRuntimeRecord["capabilityIds"])
      : [],
    hardwareContractId:
      typeof raw.hardwareContractId === "string"
        ? raw.hardwareContractId
        : null,
    deploymentProfileId:
      (raw.deploymentProfileId as PrivateAiRuntimeRecord["deploymentProfileId"]) ??
      null,
    routingContractIds: Array.isArray(raw.routingContractIds)
      ? (raw.routingContractIds as string[])
      : [],
    availability:
      (raw.availability as PrivateAiRuntimeRecord["availability"]) ?? "unknown",
    health: {
      status:
        (healthRaw.status as PrivateAiRuntimeRecord["health"]["status"]) ??
        "unknown",
      lastHeartbeatAt:
        typeof healthRaw.lastHeartbeatAt === "string"
          ? healthRaw.lastHeartbeatAt
          : null,
      lastSuccessAt:
        typeof healthRaw.lastSuccessAt === "string"
          ? healthRaw.lastSuccessAt
          : null,
      lastFailureAt:
        typeof healthRaw.lastFailureAt === "string"
          ? healthRaw.lastFailureAt
          : null,
      lastFailureReason:
        typeof healthRaw.lastFailureReason === "string"
          ? healthRaw.lastFailureReason
          : null,
      errorClass:
        (healthRaw.errorClass as PrivateAiRuntimeRecord["health"]["errorClass"]) ??
        "none",
      availability:
        (healthRaw.availability as PrivateAiRuntimeRecord["availability"]) ??
        "unknown",
      notes: String(healthRaw.notes ?? ""),
      consecutiveFailures:
        typeof healthRaw.consecutiveFailures === "number"
          ? healthRaw.consecutiveFailures
          : 0,
      consecutiveSuccesses:
        typeof healthRaw.consecutiveSuccesses === "number"
          ? healthRaw.consecutiveSuccesses
          : 0,
      lastHeartbeatSource:
        typeof healthRaw.lastHeartbeatSource === "string"
          ? healthRaw.lastHeartbeatSource
          : null,
      lastLatencyMs:
        typeof healthRaw.lastLatencyMs === "number"
          ? healthRaw.lastLatencyMs
          : null,
    },
    failoverRuntimeIds: Array.isArray(raw.failoverRuntimeIds)
      ? (raw.failoverRuntimeIds as string[])
      : [],
    ops: migrateOps(raw.ops),
    notes: String(raw.notes ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeState(parsed: unknown): PersistedPrivateAiState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (
    version !== 1 &&
    version !== 2 &&
    version !== 3 &&
    version !== 4 &&
    version !== 5 &&
    version !== 6 &&
    version !== 7
  ) {
    return null;
  }

  const models = Array.isArray(obj.models)
    ? obj.models.map((m) => migrateModel(m as Record<string, unknown>))
    : [];
  const runtimes = Array.isArray(obj.runtimes)
    ? obj.runtimes.map((r) => migrateRuntime(r as Record<string, unknown>))
    : [];

  return {
    schemaVersion: 7,
    updatedAt: String(obj.updatedAt ?? new Date().toISOString()),
    models,
    capabilities: Array.isArray(obj.capabilities)
      ? (obj.capabilities as PersistedPrivateAiState["capabilities"])
      : [],
    hardwareContracts: Array.isArray(obj.hardwareContracts)
      ? (obj.hardwareContracts as PersistedPrivateAiState["hardwareContracts"])
      : [],
    deploymentProfiles: Array.isArray(obj.deploymentProfiles)
      ? (obj.deploymentProfiles as PersistedPrivateAiState["deploymentProfiles"])
      : [],
    routingContracts: Array.isArray(obj.routingContracts)
      ? (obj.routingContracts as PersistedPrivateAiState["routingContracts"])
      : [],
    permissions: Array.isArray(obj.permissions)
      ? (obj.permissions as PersistedPrivateAiState["permissions"])
      : [],
    auditTrail: Array.isArray(obj.auditTrail)
      ? (obj.auditTrail as PersistedPrivateAiState["auditTrail"])
      : [],
    runtimes,
    runtimeIncidents: Array.isArray(obj.runtimeIncidents)
      ? (obj.runtimeIncidents as PersistedPrivateAiState["runtimeIncidents"])
      : [],
    runtimeOpsPolicy: {
      ...DEFAULT_RUNTIME_OPS_POLICY,
      ...((obj.runtimeOpsPolicy as object) ?? {}),
    },
    inferenceRequests: Array.isArray(obj.inferenceRequests)
      ? (obj.inferenceRequests as PersistedPrivateAiState["inferenceRequests"])
      : [],
    executionPlans: Array.isArray(obj.executionPlans)
      ? (obj.executionPlans as PersistedPrivateAiState["executionPlans"])
      : [],
    executionPolicy: {
      ...DEFAULT_EXECUTION_POLICY,
      ...((obj.executionPolicy as object) ?? {}),
    },
    executionQuota: {
      ...DEFAULT_EXECUTION_QUOTA,
      ...((obj.executionQuota as object) ?? {}),
    },
    providerRoutingPolicy: {
      ...DEFAULT_PROVIDER_ROUTING_POLICY,
      ...((obj.providerRoutingPolicy as object) ?? {}),
      providers:
        (obj.providerRoutingPolicy as { providers?: unknown } | undefined)
          ?.providers &&
        Array.isArray(
          (obj.providerRoutingPolicy as { providers: unknown }).providers
        )
          ? (
              obj.providerRoutingPolicy as {
                providers: PersistedPrivateAiState["providerRoutingPolicy"]["providers"];
              }
            ).providers
          : DEFAULT_PROVIDER_ROUTING_POLICY.providers,
    },
    providerRoutingEvaluations: Array.isArray(obj.providerRoutingEvaluations)
      ? (obj.providerRoutingEvaluations as PersistedPrivateAiState["providerRoutingEvaluations"])
      : [],
  };
}

export function readPersistedPrivateAiState(
  dataDir: string
): PersistedPrivateAiState | null {
  try {
    const raw = readFileSync(privateAiStorePath(dataDir), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePersistedPrivateAiState(
  dataDir: string,
  state: PersistedPrivateAiState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = privateAiStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const toWrite: PersistedPrivateAiState = {
    ...state,
    schemaVersion: 7,
    runtimes: state.runtimes ?? [],
    runtimeIncidents: state.runtimeIncidents ?? [],
    runtimeOpsPolicy: state.runtimeOpsPolicy ?? {
      ...DEFAULT_RUNTIME_OPS_POLICY,
    },
    inferenceRequests: state.inferenceRequests ?? [],
    executionPlans: state.executionPlans ?? [],
    executionPolicy: state.executionPolicy ?? { ...DEFAULT_EXECUTION_POLICY },
    executionQuota: state.executionQuota ?? { ...DEFAULT_EXECUTION_QUOTA },
    providerRoutingPolicy:
      state.providerRoutingPolicy ?? { ...DEFAULT_PROVIDER_ROUTING_POLICY },
    providerRoutingEvaluations: state.providerRoutingEvaluations ?? [],
  };
  writeFileSync(temp, JSON.stringify(toWrite, null, 2), "utf8");
  renameSync(temp, target);
}
