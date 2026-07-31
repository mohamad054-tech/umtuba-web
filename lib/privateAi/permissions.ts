import type { PermissionScope, PrivateAiPermission } from "./types";

export function createPrivateAiPermission(input: {
  id: string;
  scope: PermissionScope;
  resourceId: string;
  role: string;
  actions: string[];
  granted?: boolean;
  notes?: string;
}): PrivateAiPermission {
  return {
    id: input.id,
    scope: input.scope,
    resourceId: input.resourceId,
    role: input.role,
    actions: [...input.actions],
    granted: input.granted ?? false,
    notes: input.notes ?? "",
  };
}

export function hasPermission(
  permissions: PrivateAiPermission[],
  input: {
    scope: PermissionScope;
    resourceId: string;
    role: string;
    action: string;
  }
): boolean {
  return permissions.some(
    (p) =>
      p.granted &&
      p.scope === input.scope &&
      p.resourceId === input.resourceId &&
      p.role === input.role &&
      p.actions.includes(input.action)
  );
}

export const DEFAULT_PLATFORM_ADMIN_ACTIONS = [
  "read",
  "register",
  "lifecycle_update",
  "submit_for_review",
  "request_changes",
  "reject",
  "approve",
  "activate",
  "deprecate",
  "retire",
  "return_to_draft",
  "map_capability",
  "audit_read",
  "runtime_operate",
  "deployment_update",
  "heartbeat_record",
  "maintenance_manage",
  "failover_trigger",
  "override_manage",
  "runtime_recover",
  "inference_request",
  "inference_execute",
] as const;

export function hasRuntimeOpsPermission(
  permissions: PrivateAiPermission[],
  input: {
    role: string;
    modelId: string;
    action: string;
  }
): boolean {
  return (
    hasPermission(permissions, {
      scope: "model",
      resourceId: input.modelId,
      role: input.role,
      action: input.action,
    }) ||
    hasPermission(permissions, {
      scope: "model",
      resourceId: "*",
      role: input.role,
      action: input.action,
    }) ||
    hasPermission(permissions, {
      scope: "model",
      resourceId: "*",
      role: input.role,
      action: "runtime_operate",
    })
  );
}

/** True if role may act on resourceId or wildcard "*". */
export function hasModelLifecyclePermission(
  permissions: PrivateAiPermission[],
  input: {
    role: string;
    modelId: string;
    action: string;
  }
): boolean {
  return (
    hasPermission(permissions, {
      scope: "model",
      resourceId: input.modelId,
      role: input.role,
      action: input.action,
    }) ||
    hasPermission(permissions, {
      scope: "model",
      resourceId: "*",
      role: input.role,
      action: input.action,
    }) ||
    hasPermission(permissions, {
      scope: "model",
      resourceId: "*",
      role: input.role,
      action: "lifecycle_update",
    }) ||
    hasPermission(permissions, {
      scope: "model",
      resourceId: input.modelId,
      role: input.role,
      action: "lifecycle_update",
    })
  );
}
