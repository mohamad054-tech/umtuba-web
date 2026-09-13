import { describe, expect, it } from "vitest";
import {
  attemptCjFulfillmentWrite,
  isCjOrderFulfillmentEnabled,
  refuseCjFulfillmentWrite,
} from "./fulfillmentGuard";

describe("CJ fulfillment guard", () => {
  it("treats missing, empty, and non-true values as disabled", () => {
    expect(isCjOrderFulfillmentEnabled({})).toBe(false);
    expect(isCjOrderFulfillmentEnabled({ CJ_ORDER_FULFILLMENT_ENABLED: "" })).toBe(false);
    expect(isCjOrderFulfillmentEnabled({ CJ_ORDER_FULFILLMENT_ENABLED: "false" })).toBe(
      false
    );
    expect(isCjOrderFulfillmentEnabled({ CJ_ORDER_FULFILLMENT_ENABLED: "TRUE" })).toBe(
      true
    );
  });

  it("blocks every fulfillment write while the flag is false", () => {
    const previous = process.env.CJ_ORDER_FULFILLMENT_ENABLED;
    delete process.env.CJ_ORDER_FULFILLMENT_ENABLED;
    expect(isCjOrderFulfillmentEnabled()).toBe(false);
    expect(() => refuseCjFulfillmentWrite()).toThrow(/disabled/i);
    expect(() => attemptCjFulfillmentWrite()).toThrow(/disabled/i);
    if (previous === undefined) delete process.env.CJ_ORDER_FULFILLMENT_ENABLED;
    else process.env.CJ_ORDER_FULFILLMENT_ENABLED = previous;
  });

  it("still refuses writes if the flag is mistakenly true in this candidate", () => {
    const previous = process.env.CJ_ORDER_FULFILLMENT_ENABLED;
    process.env.CJ_ORDER_FULFILLMENT_ENABLED = "true";
    expect(() => attemptCjFulfillmentWrite()).toThrow(/disabled/i);
    if (previous === undefined) delete process.env.CJ_ORDER_FULFILLMENT_ENABLED;
    else process.env.CJ_ORDER_FULFILLMENT_ENABLED = previous;
  });
});
