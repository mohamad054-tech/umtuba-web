import type { AiCapabilityId, CapabilityRecord } from "./types";

export const AI_CAPABILITY_CATALOG: Array<{
  id: AiCapabilityId;
  label: string;
  description: string;
}> = [
  {
    id: "translation",
    label: "Translation",
    description: "Text and media translation capabilities.",
  },
  {
    id: "coding",
    label: "Coding",
    description: "Code assistance and developer tooling.",
  },
  {
    id: "learning",
    label: "Learning",
    description: "Educational tutoring and assessment support.",
  },
  {
    id: "commerce",
    label: "Commerce",
    description: "Marketplace and product intelligence.",
  },
  {
    id: "creator",
    label: "Creator",
    description: "Creator tooling and content assistance.",
  },
  {
    id: "moderation",
    label: "Moderation",
    description: "Safety and policy moderation.",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    description: "Multi-step reasoning and planning support.",
  },
  {
    id: "retrieval",
    label: "Retrieval",
    description: "Knowledge retrieval and grounding.",
  },
  {
    id: "speech",
    label: "Speech",
    description: "Speech recognition and synthesis contracts.",
  },
  {
    id: "vision",
    label: "Vision",
    description: "Image and video understanding contracts.",
  },
  {
    id: "planning",
    label: "Planning",
    description: "Task planning and agent orchestration.",
  },
  {
    id: "tool_use",
    label: "Tool Use",
    description: "Tool calling and function orchestration.",
  },
];

export function buildCapabilityRegistry(
  now = new Date().toISOString()
): CapabilityRecord[] {
  return AI_CAPABILITY_CATALOG.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    mappedModelIds: [],
    status: "registered",
    createdAt: now,
    updatedAt: now,
  }));
}

export function getCapabilityDefinition(id: AiCapabilityId) {
  return AI_CAPABILITY_CATALOG.find((c) => c.id === id) ?? null;
}
