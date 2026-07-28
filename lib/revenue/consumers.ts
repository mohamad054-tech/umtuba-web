/**
 * Revenue Consumers Registry.
 */

import { RevenuePlatformError } from "./ids";
import {
  REVENUE_CONSUMER_IDS,
  type RevenueConsumerDefinition,
  type RevenueConsumerId,
} from "./types";

const DEFAULT_CONSUMERS: RevenueConsumerDefinition[] = [
  {
    consumerId: "user",
    label: "User",
    description: "End-user buyer / learner / player.",
    canHoldWallet: true,
    canReceivePayout: false,
    enabled: true,
  },
  {
    consumerId: "creator",
    label: "Creator",
    description: "Content creator earnings party.",
    canHoldWallet: true,
    canReceivePayout: true,
    enabled: true,
  },
  {
    consumerId: "seller",
    label: "Seller",
    description: "Commerce store seller.",
    canHoldWallet: true,
    canReceivePayout: true,
    enabled: true,
  },
  {
    consumerId: "supplier",
    label: "Supplier",
    description: "Marketplace supplier.",
    canHoldWallet: true,
    canReceivePayout: true,
    enabled: true,
  },
  {
    consumerId: "platform",
    label: "Platform",
    description: "UMTUBA platform fee and revenue accounts.",
    canHoldWallet: true,
    canReceivePayout: false,
    enabled: true,
  },
  {
    consumerId: "affiliate",
    label: "Affiliate",
    description: "Affiliate / referral partner.",
    canHoldWallet: true,
    canReceivePayout: true,
    enabled: true,
  },
  {
    consumerId: "advertiser",
    label: "Advertiser",
    description: "Ads advertiser spend party.",
    canHoldWallet: true,
    canReceivePayout: false,
    enabled: true,
  },
];

export function assertRevenueConsumerId(
  consumerId: string
): asserts consumerId is RevenueConsumerId {
  if (!(REVENUE_CONSUMER_IDS as readonly string[]).includes(consumerId)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `Unknown revenue consumer: ${consumerId}`
    );
  }
}

export class RevenueConsumerRegistry {
  private readonly consumers = new Map<
    RevenueConsumerId,
    RevenueConsumerDefinition
  >();

  constructor(seed: RevenueConsumerDefinition[] = DEFAULT_CONSUMERS) {
    for (const consumer of seed) {
      this.register(consumer);
    }
  }

  register(consumer: RevenueConsumerDefinition): void {
    assertRevenueConsumerId(consumer.consumerId);
    if (!consumer.label.trim()) {
      throw new RevenuePlatformError(
        "invalid_input",
        "Consumer label required."
      );
    }
    this.consumers.set(consumer.consumerId, {
      ...consumer,
      label: consumer.label.trim(),
      description: consumer.description.trim(),
    });
  }

  get(consumerId: RevenueConsumerId): RevenueConsumerDefinition | null {
    return this.consumers.get(consumerId) ?? null;
  }

  require(consumerId: RevenueConsumerId): RevenueConsumerDefinition {
    const consumer = this.get(consumerId);
    if (!consumer?.enabled) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Revenue consumer unavailable: ${consumerId}`
      );
    }
    return consumer;
  }

  list(): RevenueConsumerDefinition[] {
    return REVENUE_CONSUMER_IDS.map((id) => this.consumers.get(id)).filter(
      (c): c is RevenueConsumerDefinition => Boolean(c)
    );
  }

  reset(seed: RevenueConsumerDefinition[] = DEFAULT_CONSUMERS): void {
    this.consumers.clear();
    for (const consumer of seed) this.register(consumer);
  }
}

export const revenueConsumerRegistry = new RevenueConsumerRegistry();
