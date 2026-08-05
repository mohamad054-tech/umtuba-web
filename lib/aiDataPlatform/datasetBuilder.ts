import type { DatasetBuilderContract, DatasetKind } from "./types";

/**
 * Dataset Builder — contracts only. No training, no data download.
 */
export const DATASET_BUILDER_CONTRACTS: DatasetBuilderContract[] = [
  {
    kind: "translation",
    label: "Translation Dataset",
    description: "Approved translation pairs and terminology-backed UI text.",
    requiredSourceKinds: ["translation", "internal"],
    notes: "Contract only — assemble via Dataset Builder in a later milestone.",
  },
  {
    kind: "learning",
    label: "Learning Dataset",
    description: "Educational platform UI and governed learning knowledge assets.",
    requiredSourceKinds: ["learning", "education_partner"],
    notes: "Excludes ungoverned course media until rights/privacy pass.",
  },
  {
    kind: "coding",
    label: "Coding Dataset",
    description: "Developer documentation and code-oriented knowledge assets.",
    requiredSourceKinds: ["code", "developer_dataset", "documentation"],
    notes: "No scraping; only registered eligible sources.",
  },
  {
    kind: "commerce",
    label: "Commerce Dataset",
    description: "Product and marketplace governed text assets.",
    requiredSourceKinds: ["commerce"],
    notes: "Customer PII must fail privacy gate before inclusion.",
  },
  {
    kind: "media",
    label: "Media Dataset",
    description: "Image/audio/video metadata contracts (not binary training).",
    requiredSourceKinds: ["video", "audio", "images"],
    notes: "Metadata lineage only in V1.",
  },
  {
    kind: "conversation",
    label: "Conversation Dataset",
    description: "Human-reviewed conversational examples for future assistants.",
    requiredSourceKinds: ["human_authored", "internal"],
    notes: "Requires explicit consent/rights on every turn.",
  },
  {
    kind: "evaluation",
    label: "Evaluation Dataset",
    description: "Held-out evaluation material linked to evaluation sets.",
    requiredSourceKinds: ["internal"],
    notes: "Never used as training input without separate approval.",
  },
  {
    kind: "mixed",
    label: "Mixed Dataset",
    description: "Multi-domain composite with explicit domain distribution.",
    requiredSourceKinds: ["internal"],
    notes: "Each constituent domain must pass eligibility independently.",
  },
];

export function getDatasetBuilderContract(
  kind: DatasetKind
): DatasetBuilderContract | null {
  return DATASET_BUILDER_CONTRACTS.find((c) => c.kind === kind) ?? null;
}

export function listDatasetBuilderContracts(): DatasetBuilderContract[] {
  return [...DATASET_BUILDER_CONTRACTS];
}
