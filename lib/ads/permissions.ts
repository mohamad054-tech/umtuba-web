import type { AdvertiserRole } from "./constants";

const ROLE_RANK: Record<AdvertiserRole, number> = {
  viewer: 1,
  analyst: 2,
  campaign_manager: 3,
  admin: 4,
  owner: 5,
};

export function canManageAccount(role: AdvertiserRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canManageCampaigns(role: AdvertiserRole | null | undefined): boolean {
  return (
    role === "owner" || role === "admin" || role === "campaign_manager"
  );
}

export function canReadMetrics(role: AdvertiserRole | null | undefined): boolean {
  return Boolean(role);
}

export function canApproveAds(role: AdvertiserRole | null | undefined): boolean {
  // Advertiser roles never self-approve. Platform admin uses admin_* RPCs;
  // legacy approve_* RPCs remain service_role-only for automation.
  void role;
  return false;
}

export function roleAtLeast(
  role: AdvertiserRole | null | undefined,
  minimum: AdvertiserRole
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canMutateSpend(_role: AdvertiserRole | null | undefined): boolean {
  return false;
}

export function canWriteReviewEvents(_role: AdvertiserRole | null | undefined): boolean {
  return false;
}
