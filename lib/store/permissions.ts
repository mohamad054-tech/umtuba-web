import type { StoreMemberRole } from "./types";

const ROLE_RANK: Record<StoreMemberRole, number> = {
  viewer: 1,
  catalog_editor: 2,
  manager: 3,
  owner: 4,
};

export function hasMinStoreRole(
  role: StoreMemberRole | null | undefined,
  minimum: StoreMemberRole
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canViewStore(role: StoreMemberRole | null | undefined): boolean {
  return hasMinStoreRole(role, "viewer");
}

export function canManageCatalog(role: StoreMemberRole | null | undefined): boolean {
  return hasMinStoreRole(role, "catalog_editor");
}

export function canManageStoreSettings(
  role: StoreMemberRole | null | undefined
): boolean {
  return hasMinStoreRole(role, "manager");
}

export function canManageMembers(role: StoreMemberRole | null | undefined): boolean {
  return hasMinStoreRole(role, "owner");
}

export function canMutateAsRole(role: StoreMemberRole | null | undefined): boolean {
  return canManageCatalog(role);
}

/** Public visibility contract for catalog queries (mirrors RLS). */
export function isPubliclyVisibleProduct(input: {
  productStatus: string;
  moderationStatus: string;
  storeStatus: string;
}): boolean {
  return (
    input.storeStatus === "active" &&
    input.productStatus === "active" &&
    input.moderationStatus === "approved"
  );
}
