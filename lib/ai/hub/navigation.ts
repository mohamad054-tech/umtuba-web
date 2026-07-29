/**
 * AI Hub navigation catalog — product entry map (no App Router / shell changes).
 */

import {
  AI_HUB_MODULE_IDS,
  type AiHubModuleId,
  type AiHubNavItem,
} from "./types";

const NAV_DEFS: Array<Omit<AiHubNavItem, "order">> = [
  {
    moduleId: "assistant",
    label: "AI Assistant",
    description: "Cross-product UMTUBA assistant entry.",
    entryKey: "hub.assistant",
    enabled: true,
  },
  {
    moduleId: "my_ai",
    label: "My AI",
    description: "Personal AI space — history, prefs, artifacts.",
    entryKey: "hub.my_ai",
    enabled: true,
  },
  {
    moduleId: "learning",
    label: "Learning AI",
    description: "Tutor and learning assistance.",
    entryKey: "hub.learning",
    enabled: true,
  },
  {
    moduleId: "creator",
    label: "Creator AI",
    description: "Creator studio assistance.",
    entryKey: "hub.creator",
    enabled: true,
  },
  {
    moduleId: "commerce",
    label: "Commerce AI",
    description: "Seller and buyer AI aids.",
    entryKey: "hub.commerce",
    enabled: true,
  },
  {
    moduleId: "search",
    label: "Search AI",
    description: "Search understanding and ranking aids.",
    entryKey: "hub.search",
    enabled: true,
  },
  {
    moduleId: "world",
    label: "World AI",
    description: "World and local contextual AI.",
    entryKey: "hub.world",
    enabled: true,
  },
  {
    moduleId: "marketing",
    label: "Marketing AI",
    description: "Campaign and copy assistance.",
    entryKey: "hub.marketing",
    enabled: true,
  },
  {
    moduleId: "ads",
    label: "Ads AI",
    description: "Ad creative and targeting aids.",
    entryKey: "hub.ads",
    enabled: true,
  },
];

export function listAiHubNavigation(): AiHubNavItem[] {
  return NAV_DEFS.map((item, index) => ({
    ...item,
    order: index,
  }));
}

export function getAiHubNavItem(
  moduleId: AiHubModuleId
): AiHubNavItem | null {
  return listAiHubNavigation().find((n) => n.moduleId === moduleId) ?? null;
}

export function assertAiHubModuleId(
  moduleId: string
): asserts moduleId is AiHubModuleId {
  if (!(AI_HUB_MODULE_IDS as readonly string[]).includes(moduleId)) {
    throw new Error(`Unknown AI Hub module: ${moduleId}`);
  }
}
