/**
 * Manual Ops Controlled Drill Preparation V1 — documentation contract tests.
 * Proves prep artifacts exist and that no live drill is asserted as started.
 * Does not enable the gate or execute payouts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateSellerLivePayoutGateForTests,
  buildSellerLivePayoutGateReadinessReport,
} from "./gate";

const ROOT = join(__dirname, "../../..");
const PREP =
  "docs/store/operations/SELLER_LIVE_PAYOUT_MANUAL_OPS_DRILL_PREP_V1.md";
const RUNBOOK =
  "docs/store/operations/SELLER_LIVE_PAYOUT_PROVIDER_RUNBOOK_V1.md";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Manual Ops drill prep — artifacts", () => {
  const prep = read(PREP);

  it("ships required checklist sections", () => {
    expect(prep).toMatch(/Operator authorization checklist/i);
    expect(prep).toMatch(/Pre-drill checklist/i);
    expect(prep).toMatch(/Eligible capture selection criteria/i);
    expect(prep).toMatch(/Success-path evidence checklist/i);
    expect(prep).toMatch(/Controlled-failure evidence checklist/i);
    expect(prep).toMatch(/Uncertain-state \/ no-auto-fail checklist/i);
    expect(prep).toMatch(/Immediate gate-OFF rollback checklist/i);
    expect(prep).toMatch(/Zero-secret logging requirements/i);
    expect(prep).toMatch(/Proof — no real drill has started/i);
  });

  it("requires separate GO and keeps gate/confirm constraints", () => {
    expect(prep).toMatch(/separate explicit GO/i);
    expect(prep).toMatch(/NOT_READY_FOR_CONTROLLED_LIVE_DRILL/);
    expect(prep).toMatch(/commerce_confirm remains false/i);
    expect(prep).not.toMatch(/SELLER_LIVE_PAYOUTS_ENABLED\s*=\s*true/);
    expect(prep).not.toMatch(/sk_live_[a-zA-Z0-9]+/);
  });

  it("does not invent bank or unsupported providers", () => {
    expect(prep).toMatch(/no bank API/i);
    expect(prep).toMatch(/Stripe Connect \/ Wise \/ PayPal/i);
    expect(read(RUNBOOK)).toMatch(/Emergency gate-off \/ rollback/i);
  });
});

describe("Manual Ops drill prep — gate remains OFF by default", () => {
  it("empty env fails closed", () => {
    const result = evaluateSellerLivePayoutGateForTests({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.livePayoutsEnabled).toBe(false);
      expect(result.code).toBe("live_flag_disabled");
    }
    const report = buildSellerLivePayoutGateReadinessReport({});
    expect(report.ready).toBe(false);
    expect(report.livePayoutsEnabledFlag).toBe(false);
  });
});
