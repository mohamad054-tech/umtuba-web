/**
 * Revenue Sources Registry.
 */

import { RevenuePlatformError } from "./ids";
import {
  REVENUE_SOURCE_IDS,
  type RevenueSourceDefinition,
  type RevenueSourceId,
} from "./types";

const DEFAULT_SOURCES: RevenueSourceDefinition[] = [
  {
    sourceId: "commerce",
    label: "Commerce",
    description: "Storefront, marketplace, and order payments.",
    enabled: true,
  },
  {
    sourceId: "learning",
    label: "Learning",
    description: "Course and academy payments.",
    enabled: true,
  },
  {
    sourceId: "games",
    label: "Games",
    description: "Games catalog and in-experience purchases.",
    enabled: true,
  },
  {
    sourceId: "ads",
    label: "Ads",
    description: "Advertiser spend and ads billing events.",
    enabled: true,
  },
  {
    sourceId: "live",
    label: "Live",
    description: "Live session monetization.",
    enabled: true,
  },
  {
    sourceId: "tips",
    label: "Tips",
    description: "User tips to creators.",
    enabled: true,
  },
  {
    sourceId: "gifts",
    label: "Gifts",
    description: "Virtual gifts and related spend.",
    enabled: true,
  },
  {
    sourceId: "subscriptions",
    label: "Subscriptions",
    description: "Recurring subscription revenue.",
    enabled: true,
  },
  {
    sourceId: "ai",
    label: "AI",
    description: "AI product monetization (future metered usage).",
    enabled: true,
  },
  {
    sourceId: "future",
    label: "Future",
    description: "Reserved slot for future revenue sources.",
    enabled: false,
  },
];

export function assertRevenueSourceId(
  sourceId: string
): asserts sourceId is RevenueSourceId {
  if (!(REVENUE_SOURCE_IDS as readonly string[]).includes(sourceId)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `Unknown revenue source: ${sourceId}`
    );
  }
}

export class RevenueSourceRegistry {
  private readonly sources = new Map<RevenueSourceId, RevenueSourceDefinition>();

  constructor(seed: RevenueSourceDefinition[] = DEFAULT_SOURCES) {
    for (const source of seed) {
      this.register(source);
    }
  }

  register(source: RevenueSourceDefinition): void {
    assertRevenueSourceId(source.sourceId);
    if (!source.label.trim()) {
      throw new RevenuePlatformError("invalid_input", "Source label required.");
    }
    this.sources.set(source.sourceId, {
      ...source,
      label: source.label.trim(),
      description: source.description.trim(),
    });
  }

  get(sourceId: RevenueSourceId): RevenueSourceDefinition | null {
    return this.sources.get(sourceId) ?? null;
  }

  require(sourceId: RevenueSourceId): RevenueSourceDefinition {
    const source = this.get(sourceId);
    if (!source?.enabled) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Revenue source unavailable: ${sourceId}`
      );
    }
    return source;
  }

  list(): RevenueSourceDefinition[] {
    return REVENUE_SOURCE_IDS.map((id) => this.sources.get(id)).filter(
      (s): s is RevenueSourceDefinition => Boolean(s)
    );
  }

  reset(seed: RevenueSourceDefinition[] = DEFAULT_SOURCES): void {
    this.sources.clear();
    for (const source of seed) this.register(source);
  }
}

export const revenueSourceRegistry = new RevenueSourceRegistry();
