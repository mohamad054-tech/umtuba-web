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

type Tone = "neutral" | "info" | "warn" | "good" | "bad";

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
  neutral: "border-white/15 bg-white/5 text-white/70",
  info: "border-sky-400/25 bg-sky-500/10 text-sky-100",
  warn: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  good: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  bad: "border-rose-400/25 bg-rose-500/10 text-rose-100",
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
}: {
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
}) {
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
