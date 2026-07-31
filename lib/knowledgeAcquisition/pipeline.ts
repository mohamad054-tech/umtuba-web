import type { AcquisitionStage } from "./types";

const FORWARD: Record<AcquisitionStage, AcquisitionStage[]> = {
  discovered: ["imported", "rejected"],
  imported: ["validated", "rejected"],
  validated: ["rights_checked", "rejected"],
  rights_checked: ["quality_checked", "rejected"],
  quality_checked: ["privacy_checked", "rejected"],
  privacy_checked: ["deduplicated", "rejected"],
  deduplicated: ["classified", "rejected"],
  classified: ["approved", "rejected"],
  approved: ["dataset_eligible", "rejected"],
  dataset_eligible: [],
  rejected: [],
};

export function canAdvanceAcquisitionStage(
  from: AcquisitionStage,
  to: AcquisitionStage
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertAdvanceAcquisitionStage(
  from: AcquisitionStage,
  to: AcquisitionStage
): void {
  if (!canAdvanceAcquisitionStage(from, to)) {
    throw new Error(`Invalid acquisition stage transition: ${from} → ${to}`);
  }
}

export const ACQUISITION_PIPELINE_ORDER: AcquisitionStage[] = [
  "discovered",
  "imported",
  "validated",
  "rights_checked",
  "quality_checked",
  "privacy_checked",
  "deduplicated",
  "classified",
  "approved",
  "dataset_eligible",
  "rejected",
];
