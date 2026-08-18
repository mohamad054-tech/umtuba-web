import {
  emptyRights,
  NOT_AN_UMTUBA_PARTNER,
  PROSPECTIVE_PARTNER_LABEL,
  type IntegrationMode,
  type IntegrationValue,
  type ProspectivePartner,
} from "./types";

const PENDING: Record<IntegrationMode, IntegrationValue> = {
  AFFILIATE: "PENDING CONTRACT",
  CATALOG_FEED: "UNKNOWN",
  EXTERNAL_ENROLLMENT: "PENDING CONTRACT",
  RESELLER: "UNKNOWN",
  CONTENT_LICENSE: "PENDING CONTRACT",
  CERTIFICATE_OWNER: "UNKNOWN",
  AI_USAGE: "UNKNOWN",
};

const LEARNING_NAMES = [
  "Coursera",
  "Udemy",
  "edX",
  "DataCamp",
  "FutureLearn",
  "Skillshare",
  "MasterClass",
] as const;

const COMMERCE_NAMES = [
  "SHEIN",
  "Temu",
  "AliExpress",
  "Alibaba",
  "Trendyol",
  "Amazon",
  "eBay",
  "DHgate",
] as const;

function prospective(
  domain: ProspectivePartner["domain"],
  name: string,
  index: number
): ProspectivePartner {
  return {
    id: `prospective-${domain}-${index + 1}`,
    displayName: name,
    domain,
    status: "PROSPECTIVE",
    partnerClaim: NOT_AN_UMTUBA_PARTNER,
    label: PROSPECTIVE_PARTNER_LABEL,
    integrations: { ...PENDING },
    rights: emptyRights(),
    notes:
      "Text-only prospective record for Product Owner review. Not a contract, not ACTIVE, no logo, no imported catalog.",
    logo: null,
    catalogImported: false,
    synthetic: true,
  };
}

export const PROSPECTIVE_LEARNING_PARTNERS: readonly ProspectivePartner[] =
  LEARNING_NAMES.map((name, index) => prospective("learning", name, index));

export const PROSPECTIVE_COMMERCE_PARTNERS: readonly ProspectivePartner[] =
  COMMERCE_NAMES.map((name, index) => prospective("commerce", name, index));

export const SYNTHETIC_LEARNING_PROVIDERS = [
  {
    id: "demo-provider-atlas",
    displayName: "Demo Provider Atlas",
    status: "REVIEW" as const,
    note: "Synthetic sandbox provider. Not a real company.",
  },
  {
    id: "demo-provider-helix",
    displayName: "Demo Provider Helix",
    status: "REVIEW" as const,
    note: "Synthetic sandbox provider. Not a real company.",
  },
  {
    id: "demo-external-nimbus",
    displayName: "Demo External Nimbus",
    status: "DRAFT" as const,
    note: "Synthetic external/affiliate label. No hosted catalog.",
  },
  {
    id: "demo-external-harbor",
    displayName: "Demo External Harbor",
    status: "DRAFT" as const,
    note: "Synthetic external/affiliate label. No hosted catalog.",
  },
  {
    id: "umtuba-originals",
    displayName: "UMTUBA Originals",
    status: "DRAFT" as const,
    note: "First-party drafts. Not auto-published.",
  },
] as const;

export function assertProspectiveNeverActive(
  partner: ProspectivePartner
): boolean {
  return partner.status === "PROSPECTIVE" && partner.catalogImported === false;
}
