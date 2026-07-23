import type {
  AdPlacement,
  AdvertiserRole,
  CallToAction,
  CampaignObjective,
  CreativeType,
} from "./constants";

export type AdvertiserAccountStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "paused"
  | "active"
  | "completed"
  | "suspended"
  | "archived";

export type CreativeStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type AdvertiserAccount = {
  id: string;
  ownerId: string;
  businessName: string;
  legalName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string | null;
  countryCode: string;
  status: AdvertiserAccountStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: AdvertiserRole;
};

export type CampaignTargeting = {
  countries: string[];
  regions: string[];
  cities: string[];
  languages: string[];
  ageMin: number;
  ageMax: number;
  gender: "all" | "female" | "male" | "non_binary" | null;
  interests: string[];
  userSegments: string[];
  placements: AdPlacement[];
  devices: string[];
  excludeCountries: string[];
  excludeRegions: string[];
  excludeCities: string[];
  excludeInterests: string[];
  excludeUserSegments: string[];
  frequencyCap: number | null;
};

export type AdCampaign = {
  id: string;
  advertiserAccountId: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  startAt: string | null;
  endAt: string | null;
  dailyBudgetMinor: number | null;
  totalBudgetMinor: number | null;
  currencyCode: string;
  spentMinor: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AdSet = {
  id: string;
  campaignId: string;
  name: string;
  status: CampaignStatus;
  targeting: CampaignTargeting;
  createdAt: string;
  updatedAt: string;
};

export type AdCreative = {
  id: string;
  advertiserAccountId: string;
  campaignId: string | null;
  adSetId: string | null;
  creativeType: CreativeType;
  headline: string;
  bodyText: string | null;
  callToAction: CallToAction;
  destinationUrl: string;
  mediaPath: string;
  thumbnailPath: string | null;
  status: CreativeStatus;
  moderationNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Deliverable row binding creative ↔ ad set (`public.ads`). Not served live in V1. */
export type AdDeliverableStatus = CampaignStatus;

export type AdDeliverable = {
  id: string;
  adSetId: string;
  creativeId: string;
  name: string;
  status: AdDeliverableStatus;
  deliveryPriority: number;
  createdAt: string;
  updatedAt: string;
};

export type AdvertiserOverviewMetrics = {
  impressions: number;
  clicks: number;
  uniqueReach: number;
  videoViews: number;
  spendMinor: number;
  /** Always false in V1 — delivery engine not live. */
  deliveryEnabled: false;
  note: string;
};

export type { AdPlacement, AdvertiserRole, CampaignObjective, CreativeType, CallToAction };
