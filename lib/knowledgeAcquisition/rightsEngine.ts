import type { KnowledgeRightsRecord, RightsStatus } from "./types";

/**
 * Fail closed: unknown/restricted never grant training or customization.
 */
export function createKnowledgeRights(input: {
  status: RightsStatus;
  owner?: string | null;
  license?: string | null;
  terms?: string | null;
  expiration?: string | null;
  commercialUse?: boolean;
  internalUse?: boolean;
  modelCustomizationPermission?: boolean;
  trainingPermission?: boolean;
  redistributionPermission?: boolean;
  attributionRequired?: boolean;
  attributionNotes?: string | null;
  sensitiveRestrictions?: string[];
}): KnowledgeRightsRecord {
  const status = input.status;
  const blocked = status === "unknown" || status === "restricted";
  const restrictedLicense = status === "licensed_restricted";

  return {
    status,
    owner: input.owner ?? null,
    license: input.license ?? null,
    terms: input.terms ?? null,
    expiration: input.expiration ?? null,
    commercialUse: blocked
      ? false
      : (input.commercialUse ??
        (status === "owned_internal" ||
          status === "licensed_ok" ||
          status === "public_domain" ||
          status === "open_license")),
    internalUse: blocked ? false : (input.internalUse ?? true),
    modelCustomizationPermission:
      blocked || restrictedLicense
        ? false
        : (input.modelCustomizationPermission ??
          (status === "owned_internal" || status === "public_domain")),
    trainingPermission:
      blocked || restrictedLicense
        ? false
        : (input.trainingPermission ??
          (status === "owned_internal" || status === "public_domain")),
    redistributionPermission: blocked
      ? false
      : (input.redistributionPermission ??
        (status === "public_domain" || status === "open_license")),
    attributionRequired:
      input.attributionRequired ??
      (status === "open_license" || status === "licensed_ok"),
    attributionNotes: input.attributionNotes ?? null,
    sensitiveRestrictions: input.sensitiveRestrictions ?? [],
  };
}

export function assertRightsAllowTraining(rights: KnowledgeRightsRecord): boolean {
  if (rights.status === "unknown" || rights.status === "restricted") return false;
  return rights.trainingPermission === true;
}

export function assertRightsAllowCustomization(
  rights: KnowledgeRightsRecord
): boolean {
  if (rights.status === "unknown" || rights.status === "restricted") return false;
  return rights.modelCustomizationPermission === true;
}
