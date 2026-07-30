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
  "map_capability",
  "audit_read",
] as const;
