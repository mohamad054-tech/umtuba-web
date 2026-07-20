/**
 * Fulfillment Foundation V1 — lifecycle stages and transition rules.
 * Complements coarse orders.fulfillment_status without replacing it.
 */

export const FULFILLMENT_LIFECYCLE_STAGES = [
  "pending",
  "confirmed",
  "preparing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
] as const;
export type FulfillmentLifecycleStage =
  (typeof FULFILLMENT_LIFECYCLE_STAGES)[number];

export const FULFILLMENT_LIFECYCLE_LABELS: Record<
  FulfillmentLifecycleStage,
  string
> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

/** Maps lifecycle stage to orders.status when syncing (null = no auto sync). */
export const FULFILLMENT_TO_ORDER_STATUS: Partial<
  Record<FulfillmentLifecycleStage, string>
> = {
  confirmed: "confirmed",
  preparing: "processing",
  packed: "packed",
  shipped: "shipped",
  out_for_delivery: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
};

export const FULFILLMENT_LIFECYCLE_TRANSITIONS: Record<
  FulfillmentLifecycleStage,
  readonly FulfillmentLifecycleStage[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: ["refunded"],
  refunded: [],
};

export const TERMINAL_FULFILLMENT_STAGES: readonly FulfillmentLifecycleStage[] =
  ["cancelled", "refunded"] as const;

export function isFulfillmentLifecycleStage(
  value: unknown
): value is FulfillmentLifecycleStage {
  return (
    typeof value === "string" &&
    (FULFILLMENT_LIFECYCLE_STAGES as readonly string[]).includes(value)
  );
}

export function canTransitionFulfillmentLifecycle(
  from: FulfillmentLifecycleStage,
  to: FulfillmentLifecycleStage
): boolean {
  if (from === to) return true;
  return FULFILLMENT_LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function assertFulfillmentLifecycleTransition(
  from: FulfillmentLifecycleStage,
  to: FulfillmentLifecycleStage
): { ok: true } | { ok: false; message: string } {
  if (!isFulfillmentLifecycleStage(from) || !isFulfillmentLifecycleStage(to)) {
    return { ok: false, message: "Invalid fulfillment lifecycle stage." };
  }
  if (!canTransitionFulfillmentLifecycle(from, to)) {
    return {
      ok: false,
      message: `Cannot transition fulfillment from ${from} to ${to}.`,
    };
  }
  return { ok: true };
}

export function nextFulfillmentLifecycleStages(
  from: FulfillmentLifecycleStage
): readonly FulfillmentLifecycleStage[] {
  return FULFILLMENT_LIFECYCLE_TRANSITIONS[from];
}

export function isTerminalFulfillmentLifecycle(
  stage: FulfillmentLifecycleStage
): boolean {
  return (TERMINAL_FULFILLMENT_STAGES as readonly string[]).includes(stage);
}

export function buildFulfillmentTimeline(input: {
  createdAt: string;
  stage: FulfillmentLifecycleStage;
  events: Array<{ stage: FulfillmentLifecycleStage; at: string; note?: string | null }>;
}): Array<{
  stage: FulfillmentLifecycleStage;
  label: string;
  at: string | null;
  note: string | null;
  done: boolean;
}> {
  const eventMap = new Map(
    input.events.map((e) => [e.stage, e] as const)
  );
  const stageIndex = FULFILLMENT_LIFECYCLE_STAGES.indexOf(input.stage);

  return FULFILLMENT_LIFECYCLE_STAGES.filter(
    (s) => !["returned", "refunded"].includes(s) || stageIndex >= FULFILLMENT_LIFECYCLE_STAGES.indexOf(s)
  ).map((stage) => {
    const evt = eventMap.get(stage);
    const idx = FULFILLMENT_LIFECYCLE_STAGES.indexOf(stage);
    return {
      stage,
      label: FULFILLMENT_LIFECYCLE_LABELS[stage],
      at: evt?.at ?? (stage === "pending" ? input.createdAt : null),
      note: evt?.note ?? null,
      done: idx <= stageIndex && stage !== "cancelled",
    };
  });
}

export function mapFulfillmentRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) return "You cannot update this fulfillment.";
  if (m.includes("not found")) return "Fulfillment record not found.";
  if (m.includes("invalid fulfillment lifecycle")) {
    return "That fulfillment status change is not allowed.";
  }
  if (m.includes("terminal")) return "This fulfillment can no longer be updated.";
  return message || "Could not update fulfillment.";
}
