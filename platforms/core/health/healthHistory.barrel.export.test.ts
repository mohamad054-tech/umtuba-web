import { describe, expect, it } from "vitest";
import {
  UmHealthHistoryCode,
  createInMemoryHealthObservationHistory,
} from "./index";
import { UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE } from "../packageIdentity";

describe("bounded health history shared export wiring", () => {
  it("exports factory + codes from health barrel and P22 package identity", () => {
    expect(typeof createInMemoryHealthObservationHistory).toBe("function");
    expect(UmHealthHistoryCode.CAPACITY_INVALID).toBe(
      "health.history.capacity_invalid",
    );
    expect(UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE).toBe("P22");
  });
});
