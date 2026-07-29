import type { BuyerStatusChip } from "../../../lib/store/buyerOrdersPresentation";
import { buildBuyerStatusChips } from "../../../lib/store/buyerOrdersPresentation";
import {
  formatFulfillmentStatus,
  formatOrderStatus,
  formatPaymentStatus,
} from "../../../lib/store/orderRules";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "../../../lib/store/types";

type Tone = BuyerStatusChip["tone"];

const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: "warn",
  confirmed: "info",
  processing: "info",
  packed: "info",
  shipped: "good",
  delivered: "good",
  cancelled: "bad",
  refunded: "bad",
};

const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  pending: "warn",
  authorized: "info",
  paid: "good",
  failed: "bad",
  refunded: "bad",
};

const FULFILLMENT_TONE: Record<FulfillmentStatus, Tone> = {
  unfulfilled: "warn",
  partial: "info",
  fulfilled: "good",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral:
    "border-[var(--sf-line)] bg-white/5 text-[var(--sf-muted)]",
  info: "border-[rgba(214,196,161,0.35)] bg-[rgba(214,196,161,0.1)] text-[var(--sf-accent-strong)]",
  warn: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  good: "border-[rgba(159,214,184,0.35)] bg-[rgba(159,214,184,0.1)] text-[var(--sf-ok)]",
  bad: "border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.1)] text-[var(--sf-danger)]",
};

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge label={formatOrderStatus(status)} tone={ORDER_TONE[status]} />
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge label={formatPaymentStatus(status)} tone={PAYMENT_TONE[status]} />
  );
}

export function FulfillmentStatusBadge({
  status,
}: {
  status: FulfillmentStatus;
}) {
  return (
    <Badge
      label={formatFulfillmentStatus(status)}
      tone={FULFILLMENT_TONE[status]}
    />
  );
}

export function OrderStatusCluster({
  status,
  paymentStatus,
  fulfillmentStatus,
  shippedAt,
  deliveredAt,
  buyerReadable = false,
}: {
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  /** When true, render separate order/payment/fulfillment/delivery chips. */
  buyerReadable?: boolean;
}) {
  if (buyerReadable) {
    const chips = buildBuyerStatusChips({
      status,
      paymentStatus,
      fulfillmentStatus,
      shippedAt,
      deliveredAt,
    });
    return (
      <div className="flex flex-wrap gap-2" role="list" aria-label="Order states">
        {chips.map((chip) => (
          <span key={chip.kind} role="listitem">
            <Badge label={chip.label} tone={chip.tone} />
          </span>
        ))}
      </div>
    );
  }

  const payment = (
    ["pending", "authorized", "paid", "failed", "refunded"] as const
  ).includes(paymentStatus as PaymentStatus)
    ? (paymentStatus as PaymentStatus)
    : "pending";

  return (
    <div className="flex flex-wrap gap-2">
      <OrderStatusBadge status={status} />
      <PaymentStatusBadge status={payment} />
      <FulfillmentStatusBadge status={fulfillmentStatus} />
    </div>
  );
}
