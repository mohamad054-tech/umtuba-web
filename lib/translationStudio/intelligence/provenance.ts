import type {
  ProvenanceRecord,
  ProvenanceType,
  UsageRightsRecord,
  UsageRightsStatus,
} from "./types";

export function createProvenance(input: {
  type: ProvenanceType;
  providerName?: string | null;
  providerModel?: string | null;
  originalSourceOwnership?: string | null;
  attributionNotes?: string | null;
  rawResponseRef?: string | null;
  rawResponseHash?: string | null;
}): ProvenanceRecord {
  return {
    type: input.type,
    providerName: input.providerName ?? null,
    providerModel: input.providerModel ?? null,
    originalSourceOwnership: input.originalSourceOwnership ?? null,
    attributionNotes: input.attributionNotes ?? null,
    rawResponseRef: input.rawResponseRef ?? null,
    rawResponseHash: input.rawResponseHash ?? null,
  };
}

/**
 * Fail closed: unknown/restricted never grant model-customization permission.
 */
export function createUsageRights(input: {
  status: UsageRightsStatus;
  permissionReuseInternally?: boolean;
  permissionModelCustomization?: boolean;
  notes?: string | null;
}): UsageRightsRecord {
  const status = input.status;
  const blocked = status === "unknown" || status === "restricted";
  const projectOnly = status === "licensed_project_only";

  return {
    status,
    permissionReuseInternally: blocked
      ? false
      : (input.permissionReuseInternally ??
        (status === "owned_internal" || status === "licensed_reuse_ok")),
    permissionModelCustomization: blocked || projectOnly
      ? false
      : (input.permissionModelCustomization ?? status === "owned_internal"),
    notes: input.notes ?? null,
  };
}

export function isTrustedProvenance(type: ProvenanceType): boolean {
  return (
    type === "human_authored" ||
    type === "manual_revision" ||
    type === "imported_customer_translation"
  );
}

export function isExternalUntrustedProvenance(type: ProvenanceType): boolean {
  return (
    type === "external_translation_service" ||
    type === "subtitle_transcription" ||
    type === "speech_translation" ||
    type === "internal_ai_suggestion"
  );
}
