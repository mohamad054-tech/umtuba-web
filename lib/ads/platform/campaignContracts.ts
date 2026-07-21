import type { CampaignObjective } from "../constants";
import type { CampaignStatus } from "../types";
import type { AdsPlatformCreativeType } from "./creativeContracts";
import type { AdsPlatformPlacementId } from "./placementRegistry";

export type AdsPlatformContractVersion = 1;
export type AdsLifecycleStatus = CampaignStatus;

export type CreativeReference = Readonly<{
  creativeId: string;
  creativeType: AdsPlatformCreativeType;
  revision: number;
}>;

export type PlacementReference = Readonly<{
  placementId: AdsPlatformPlacementId;
}>;

export type TargetingReference = Readonly<{
  targetingId: string;
  version: number;
}>;

export type BudgetReference = Readonly<{
  budgetId: string;
  version: number;
}>;

export type PolicyReference = Readonly<{
  policyId: string;
  version: number;
}>;

export type LifecycleReference = Readonly<{
  status: AdsLifecycleStatus;
  version: number;
}>;

export type CampaignContract = Readonly<{
  contractVersion: AdsPlatformContractVersion;
  campaignId: string;
  advertiserAccountId: string;
  name: string;
  objective: CampaignObjective;
  schedule: Readonly<{
    startsAt: string | null;
    endsAt: string | null;
  }>;
  budget: BudgetReference;
  policy: PolicyReference;
  lifecycle: LifecycleReference;
}>;

export type AdSetContract = Readonly<{
  contractVersion: AdsPlatformContractVersion;
  adSetId: string;
  campaignId: string;
  name: string;
  placements: readonly PlacementReference[];
  targeting: TargetingReference;
  budget: BudgetReference | null;
  policy: PolicyReference;
  lifecycle: LifecycleReference;
}>;

export type AdContract = Readonly<{
  contractVersion: AdsPlatformContractVersion;
  adId: string;
  adSetId: string;
  creative: CreativeReference;
  policy: PolicyReference;
  lifecycle: LifecycleReference;
}>;

export type AdsCampaignObjectContracts = Readonly<{
  campaign: CampaignContract;
  adSets: readonly AdSetContract[];
  ads: readonly AdContract[];
}>;
