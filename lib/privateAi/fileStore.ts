import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  PersistedPrivateAiState,
  PrivateAiLifecycle,
  PrivateModelRecord,
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
    schemaVersion: 2,
    updatedAt: now,
    models: [],
    capabilities: [],
    hardwareContracts: [],
    deploymentProfiles: [],
    routingContracts: [],
    permissions: [],
    auditTrail: [],
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

function normalizeState(parsed: unknown): PersistedPrivateAiState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (version !== 1 && version !== 2) return null;

  const models = Array.isArray(obj.models)
    ? obj.models.map((m) => migrateModel(m as Record<string, unknown>))
    : [];

  return {
    schemaVersion: 2,
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
    schemaVersion: 2,
  };
  writeFileSync(temp, JSON.stringify(toWrite, null, 2), "utf8");
  renameSync(temp, target);
}
