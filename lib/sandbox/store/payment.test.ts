import { describe, expect, it } from "vitest";
import { MOCK_PAYMENT_ADAPTER } from "../fixtures/types";
import {
  ALL_MOCK_PAYMENT_OUTCOMES,
  checkoutCreatesOrder,
  runSandboxMockPayment,
} from "./payment";

describe("sandbox mock payment adapter", () => {
  it("covers SUCCESS DECLINED PROCESSING CANCELLED REFUND_PENDING REFUNDED_DEMO", () => {
    expect([...ALL_MOCK_PAYMENT_OUTCOMES]).toEqual([
      "SUCCESS",
      "DECLINED",
      "PROCESSING",
      "CANCELLED",
      "REFUND_PENDING",
      "REFUNDED_DEMO",
    ]);
  });

  it("never calls a real provider or enables a real charge", () => {
    for (const outcome of ALL_MOCK_PAYMENT_OUTCOMES) {
      const result = runSandboxMockPayment(outcome);
      expect(result.paymentMode).toBe("SANDBOX");
      expect(result.realPayment).toBe(false);
      expect(result.realProviderCall).toBe(false);
      expect(result.realChargePossible).toBe(false);
      expect(result.storesCardNumbers).toBe(false);
      expect(result.adapterId).toBe(MOCK_PAYMENT_ADAPTER.id);
    }
    expect(MOCK_PAYMENT_ADAPTER.realProviderCall).toBe(false);
    expect(MOCK_PAYMENT_ADAPTER.realChargePossible).toBe(false);
  });

  it("creates an order only for success and processing", () => {
    expect(checkoutCreatesOrder("SUCCESS")).toBe(true);
    expect(checkoutCreatesOrder("PROCESSING")).toBe(true);
    expect(checkoutCreatesOrder("DECLINED")).toBe(false);
    expect(checkoutCreatesOrder("CANCELLED")).toBe(false);
  });
});
