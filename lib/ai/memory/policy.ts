import { randomUUID } from "crypto";
import type { AiDataClassification } from "../contracts/types";
import { AiPlatformError } from "../contracts/errors";

export const AI_MEMORY_SCOPES = [
  "session",
  "user_preference",
  "workspace",
  "project_course",
  "agent_workflow",
] as const;
export type AiMemoryScope = (typeof AI_MEMORY_SCOPES)[number];

export type AiMemoryPolicy = {
  scope: AiMemoryScope;
  ownerField: "userId" | "workspaceId" | "sessionId" | "projectId";
  dataClassification: AiDataClassification;
  readPermission: string;
  writePermission: string;
  retentionDays: number | null;
  requiresHumanConfirmationToPersist: boolean;
  autoPersistConversations: false;
};

export const AI_MEMORY_POLICIES: Record<AiMemoryScope, AiMemoryPolicy> = {
  session: {
    scope: "session",
    ownerField: "sessionId",
    dataClassification: "internal",
    readPermission: "ai.memory.session.read",
    writePermission: "ai.memory.session.write",
    retentionDays: 7,
    requiresHumanConfirmationToPersist: false,
    autoPersistConversations: false,
  },
  user_preference: {
    scope: "user_preference",
    ownerField: "userId",
    dataClassification: "confidential",
    readPermission: "ai.memory.user.read",
    writePermission: "ai.memory.user.write",
    retentionDays: 365,
    requiresHumanConfirmationToPersist: true,
    autoPersistConversations: false,
  },
  workspace: {
    scope: "workspace",
    ownerField: "workspaceId",
    dataClassification: "confidential",
    readPermission: "ai.memory.workspace.read",
    writePermission: "ai.memory.workspace.write",
    retentionDays: 180,
    requiresHumanConfirmationToPersist: true,
    autoPersistConversations: false,
  },
  project_course: {
    scope: "project_course",
    ownerField: "projectId",
    dataClassification: "internal",
    readPermission: "ai.memory.project.read",
    writePermission: "ai.memory.project.write",
    retentionDays: 90,
    requiresHumanConfirmationToPersist: true,
    autoPersistConversations: false,
  },
  agent_workflow: {
    scope: "agent_workflow",
    ownerField: "sessionId",
    dataClassification: "internal",
    readPermission: "ai.memory.workflow.read",
    writePermission: "ai.memory.workflow.write",
    retentionDays: 30,
    requiresHumanConfirmationToPersist: false,
    autoPersistConversations: false,
  },
};

export type AiMemoryRecord = {
  id: string;
  scope: AiMemoryScope;
  ownerId: string;
  key: string;
  value: Record<string, unknown>;
  dataClassification: AiDataClassification;
  provenance: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type AiMemoryStore = {
  get: (scope: AiMemoryScope, ownerId: string, key: string) => Promise<AiMemoryRecord | null>;
  set: (record: Omit<AiMemoryRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<AiMemoryRecord>;
  delete: (scope: AiMemoryScope, ownerId: string, key: string) => Promise<void>;
};

const memoryMap = new Map<string, AiMemoryRecord>();

function memKey(scope: AiMemoryScope, ownerId: string, key: string): string {
  return `${scope}:${ownerId}:${key}`;
}

export function createInMemoryAiMemoryStore(): AiMemoryStore {
  return {
    async get(scope, ownerId, key) {
      return memoryMap.get(memKey(scope, ownerId, key)) ?? null;
    },
    async set(input) {
      const policy = AI_MEMORY_POLICIES[input.scope];
      if (policy.autoPersistConversations) {
        throw new AiPlatformError(
          "configuration_invalid",
          "Automatic conversation persistence is forbidden."
        );
      }
      const now = new Date().toISOString();
      const existing = memoryMap.get(
        memKey(input.scope, input.ownerId, input.key)
      );
      const record: AiMemoryRecord = {
        id: input.id ?? existing?.id ?? randomUUID(),
        scope: input.scope,
        ownerId: input.ownerId,
        key: input.key,
        value: input.value,
        dataClassification: input.dataClassification,
        provenance: input.provenance,
        confidence: input.confidence,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      memoryMap.set(memKey(input.scope, input.ownerId, input.key), record);
      return record;
    },
    async delete(scope, ownerId, key) {
      memoryMap.delete(memKey(scope, ownerId, key));
    },
  };
}

export function resetAiMemoryState(): void {
  memoryMap.clear();
}

export function assertMemoryPermission(input: {
  scope: AiMemoryScope;
  action: "read" | "write";
  permissions: string[];
  confirmed?: boolean;
}): void {
  const policy = AI_MEMORY_POLICIES[input.scope];
  const needed =
    input.action === "read" ? policy.readPermission : policy.writePermission;
  if (!input.permissions.includes(needed)) {
    throw new AiPlatformError(
      "permission_denied",
      `Missing memory permission: ${needed}`
    );
  }
  if (
    input.action === "write" &&
    policy.requiresHumanConfirmationToPersist &&
    !input.confirmed
  ) {
    throw new AiPlatformError(
      "permission_denied",
      "Human confirmation required to persist this memory."
    );
  }
}
