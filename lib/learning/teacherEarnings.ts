/**
 * UMTUBA Learning — Teacher earnings architecture (payments disabled).
 *
 * Prepares ledger kinds and UI contracts. Does not invent a commission
 * percentage and does not connect a payment provider.
 */

export const REAL_COURSE_PAYMENT = false;
export const REAL_TEACHER_PAYOUT = false;
export const PAYMENT_PROVIDER_CONNECTED = false;

export const LEARNING_TEACHER_COMMISSION_PERCENT: null = null;

export const LEARNING_TEACHER_EARNINGS_KINDS = [
  "COURSE_PRICE",
  "GROSS_REVENUE",
  "PLATFORM_COMMISSION",
  "TEACHER_NET",
  "REFUNDS",
  "PAYOUT_PENDING",
  "PAYOUT_AVAILABLE",
  "PAYOUT_PAID",
] as const;
export type LearningTeacherEarningsKind =
  (typeof LEARNING_TEACHER_EARNINGS_KINDS)[number];

export const LEARNING_TEACHER_EARNINGS_KIND_KEYS = {
  COURSE_PRICE: "teacher.earnings.kind.coursePrice",
  GROSS_REVENUE: "teacher.earnings.kind.grossRevenue",
  PLATFORM_COMMISSION: "teacher.earnings.kind.platformCommission",
  TEACHER_NET: "teacher.earnings.kind.teacherNet",
  REFUNDS: "teacher.earnings.kind.refunds",
  PAYOUT_PENDING: "teacher.earnings.kind.payoutPending",
  PAYOUT_AVAILABLE: "teacher.earnings.kind.payoutAvailable",
  PAYOUT_PAID: "teacher.earnings.kind.payoutPaid",
} as const satisfies Record<LearningTeacherEarningsKind, string>;

export type LearningTeacherEarningsRow = {
  kind: LearningTeacherEarningsKind;
  amount_minor: number | null;
  currency: string | null;
  note_key: string;
};

export type LearningTeacherEarningsSnapshot = {
  payments_enabled: false;
  payouts_enabled: false;
  provider_connected: false;
  commission_percent: null;
  rows: LearningTeacherEarningsRow[];
};

export function emptyTeacherEarningsSnapshot(): LearningTeacherEarningsSnapshot {
  return {
    payments_enabled: false,
    payouts_enabled: false,
    provider_connected: false,
    commission_percent: null,
    rows: LEARNING_TEACHER_EARNINGS_KINDS.map((kind) => ({
      kind,
      amount_minor: null,
      currency: null,
      note_key:
        kind === "PLATFORM_COMMISSION"
          ? "teacher.earnings.commissionUnset"
          : "teacher.earnings.disabled",
    })),
  };
}

export function isTeacherEarningsKind(
  value: string
): value is LearningTeacherEarningsKind {
  return (LEARNING_TEACHER_EARNINGS_KINDS as readonly string[]).includes(value);
}
