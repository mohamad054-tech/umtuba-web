import { MOCK_PAYMENT_ADAPTER, simulateSandboxPayment } from "../fixtures/commerce";
import type { SandboxCourse } from "../fixtures/types";
import { isPaidCourse } from "./catalog";

export const LEARNING_PAYMENT_OUTCOMES = ["SUCCESS", "FAILURE", "REFUND", "PENDING"] as const;
export type LearningPaymentOutcome = (typeof LEARNING_PAYMENT_OUTCOMES)[number];

export type LearningPaymentRecord = {
  id: string;
  courseSlug: string;
  studentId: string;
  amountMinor: number;
  currency: "USD";
  outcome: LearningPaymentOutcome;
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
  paymentMode: "SANDBOX";
  realPayment: false;
  realChargePossible: false;
  storesCardNumbers: false;
};

export function learningPaymentEconomics(course: SandboxCourse) {
  if (course.kind === "UMTUBA_ORIGINAL") {
    return {
      listPriceMinor: course.listPriceMinor ?? 0,
      umtubaSharePercent: 100,
      partnerSharePercent: 0,
      payoutEnabled: false,
      note: "Owned draft. No payout. Certificate owner is UMTUBA.",
    };
  }
  if (course.kind === "PARTNER_COURSE") {
    return {
      listPriceMinor: course.listPriceMinor ?? 4900,
      umtubaSharePercent: course.revenueSharePercent ?? 20,
      partnerSharePercent: 100 - (course.revenueSharePercent ?? 20),
      payoutEnabled: false,
      note: "Synthetic revenue share. Demo provider. No actual payout.",
    };
  }
  return {
    listPriceMinor: null as number | null,
    umtubaSharePercent: null as number | null,
    partnerSharePercent: null as number | null,
    payoutEnabled: false,
    note: "Affiliate / referral UX. No hosted checkout.",
  };
}

export function canMockPay(course: SandboxCourse): boolean {
  return isPaidCourse(course) && course.enrollmentMode !== "EXTERNAL_CONTINUE";
}

export function applyLearningPayment(
  course: SandboxCourse,
  studentId: string,
  outcome: LearningPaymentOutcome
): LearningPaymentRecord {
  simulateSandboxPayment(outcome);
  const status =
    outcome === "SUCCESS"
      ? "CAPTURED"
      : outcome === "FAILURE"
        ? "FAILED"
        : outcome === "REFUND"
          ? "REFUNDED"
          : "AUTHORIZED";
  return {
    id: `learn-pay-${course.slug}-${studentId}-${outcome.toLowerCase()}`,
    courseSlug: course.slug,
    studentId,
    amountMinor: course.listPriceMinor ?? 0,
    currency: "USD",
    outcome,
    status,
    paymentMode: "SANDBOX",
    realPayment: false,
    realChargePossible: false,
    storesCardNumbers: false,
  };
}

export function paymentUnlocksCourse(record: LearningPaymentRecord | undefined): boolean {
  return record?.outcome === "SUCCESS" && record.realPayment === false;
}

export const LEARNING_MOCK_ADAPTER = {
  ...MOCK_PAYMENT_ADAPTER,
  domain: "learning" as const,
  collectsCards: false,
};
