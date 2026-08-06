/**
 * UM Core P1 — package identity smoke test.
 *
 * Confirms the isolated contracts package loads.
 * Does not exercise registries, buses, flags, or any runtime engine.
 */

import { describe, expect, it } from "vitest";
import {
  UM_CORE_FOUNDATION_PHASE,
  UM_CORE_MANIFEST_VALIDATION_PHASE,
  UM_CORE_PACKAGE_ID,
  UM_CORE_PACKAGE_LABEL,
  UM_MATURITY_DESCRIPTORS,
} from "./index";

describe("um.core foundation P1 package identity", () => {
  it("exposes durable package identity literals", () => {
    expect(UM_CORE_PACKAGE_ID).toBe("um.core");
    expect(UM_CORE_FOUNDATION_PHASE).toBe("P1");
    expect(UM_CORE_MANIFEST_VALIDATION_PHASE).toBe("P2");
    expect(UM_CORE_PACKAGE_LABEL).toBe("UM Core Platform");
  });

  it("exposes maturity descriptors for levels 0–4", () => {
    expect(UM_MATURITY_DESCRIPTORS).toHaveLength(5);
    expect(UM_MATURITY_DESCRIPTORS.map((d) => d.level)).toEqual([0, 1, 2, 3, 4]);
  });
});
