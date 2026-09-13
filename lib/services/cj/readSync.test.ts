import { describe, expect, it } from "vitest";
import { runCjReadSyncFailClosed, runScheduledCjReadSync } from "./readSync";

describe("CJ fail-closed read sync", () => {
  it("refuses live traffic without rotation acknowledgement", () => {
    const result = runCjReadSyncFailClosed({
      CJ_API_KEY: "must-not-be-used",
      CJ_API_KEY_ROTATED: "false",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("PENDING_KEY_ROTATION");
    expect(result.live_calls).toBe(0);
    expect(result.write_calls).toBe(0);
  });

  it("refuses when rotation is acknowledged but the server key is missing", () => {
    const result = runCjReadSyncFailClosed({
      CJ_API_KEY: "",
      CJ_API_KEY_ROTATED: "true",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("MISSING_SERVER_KEY");
    expect(result.live_calls).toBe(0);
  });

  it("does not execute live calls even when authorized in this task", () => {
    const result = runScheduledCjReadSync({
      CJ_API_KEY: "rotated-placeholder-not-used",
      CJ_API_KEY_ROTATED: "true",
      CJ_ORDER_FULFILLMENT_ENABLED: "true",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("AUTHORIZED_NOT_EXECUTED_IN_THIS_TASK");
      expect(result.live_calls).toBe(0);
      expect(result.write_calls).toBe(0);
      expect(result.plan.write_calls_enabled).toBe(false);
    }
  });
});
