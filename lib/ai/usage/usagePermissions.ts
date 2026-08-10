import { AiPlatformError } from "../contracts/errors";
import type { AiUsageActor, AiUsagePermission } from "./quotasBillingTypes";

export function actorHasPermission(
  actor: AiUsageActor,
  permission: AiUsagePermission
): boolean {
  if (actor.isSystem) return true;
  return actor.permissions.includes(permission);
}

export function requireUsagePermission(
  actor: AiUsageActor,
  permission: AiUsagePermission
): void {
  if (!actorHasPermission(actor, permission)) {
    throw new AiPlatformError(
      "permission_denied",
      `Missing AI usage permission: ${permission}`
    );
  }
}

export function assertTenantScope(
  actor: AiUsageActor,
  tenantId: string
): void {
  if (actor.isSystem) return;
  if (actorHasPermission(actor, "usage_read_admin")) return;
  if (actor.tenantId !== tenantId) {
    throw new AiPlatformError(
      "permission_denied",
      "Tenant isolation violation."
    );
  }
}

export function assertSelfOrAdmin(
  actor: AiUsageActor,
  userId: string
): void {
  if (actor.isSystem) return;
  if (actorHasPermission(actor, "usage_read_admin")) return;
  if (actorHasPermission(actor, "usage_read_tenant")) return;
  if (
    actorHasPermission(actor, "usage_read_self") &&
    actor.userId === userId
  ) {
    return;
  }
  throw new AiPlatformError(
    "permission_denied",
    "Cannot read another user's usage."
  );
}

export function adminUsageActor(userId: string, tenantId: string): AiUsageActor {
  return {
    userId,
    tenantId,
    permissions: [
      "usage_record",
      "usage_read_self",
      "usage_read_tenant",
      "usage_read_admin",
      "quota_manage",
      "budget_manage",
      "pricing_manage",
      "exemption_manage",
    ],
  };
}
