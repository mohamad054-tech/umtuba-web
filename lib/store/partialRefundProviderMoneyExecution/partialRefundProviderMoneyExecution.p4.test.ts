/**
 * P4/P5A/P5C/P5C2 tests — remote-apply readiness audits (no remote apply, no money).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deriveProviderMoneyLatestOperation,
  toProviderMoneyAuditView,
  type PartialRefundProviderExecutionRecord,
} from "./index";

const ROOT = join(__dirname, "../../..");
const MIGRATION =
  "supabase/migrations/20260915_store_partial_refund_provider_money_execution_v1.sql";
const P5A_REPORT =
  "docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5A_RENUMBER_REPORT.md";
const P5C_REPORT =
  "docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md";
const P5C2_REPORT =
  "docs/store/implementation/COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md";
const DRY_RUN =
  "docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TEST_MODE_DRY_RUN_CHECKLIST.md";
const PROD_CHECK =
  "docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_PRODUCTION_ENABLEMENT_PREREQUISITES.md";
const APPLY_PLAN =
  "docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TARGETED_REMOTE_APPLY_PLAN.md";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("P5C2 allocation + P4 readiness contracts", () => {
  it("records SHA256 for 20260915 and documents rejected Learning/Translation slots", () => {
    const sql = read(MIGRATION);
    const sha = createHash("sha256").update(sql).digest("hex").toUpperCase();
    expect(sha).toBe(
      "68E24761F4357E0516FD4D0F1BF7ADFA0EDE259F4EAEA52351C99BA81B555273"
    );
    expect(sql).toMatch(/learning_personal_notes_hub_v1/);
    expect(sql).toMatch(/learning_assessment_due_ux_followthrough_v1/);
    expect(sql).toMatch(/translation_studio_memory_identity_contract_align_v1/);
    expect(sql).toMatch(/Rejected: 20260908/);
    expect(sql).toMatch(/20260914 \(Translation reserved/);
    expect(sql).toMatch(/renumbered local draft to 20260915/);
    expect(sql).toMatch(/Active Commerce draft version: 20260915/);

    const reportA = read(P5A_REPORT);
    expect(reportA).toMatch(/RENUMBERED_P4_READY_FOR_REMOTE_APPLY_GO/);
    expect(reportA).toMatch(/learning_personal_notes_hub_v1/);

    const reportC = read(P5C_REPORT);
    expect(reportC).toMatch(/P5C_RENUMBERED_READY_FOR_IMMEDIATE_REMOTE_APPLY_GO/);
    expect(reportC).toMatch(/20260914/);

    const reportC2 = read(P5C2_REPORT);
    expect(reportC2).toMatch(/P5C2_RENUMBERED_READY_FOR_IMMEDIATE_REMOTE_APPLY_GO/);
    expect(reportC2).toMatch(/20260915/);
    expect(reportC2).toMatch(/translation_studio_memory_identity_contract_align_v1/);
  });

  it("SQL remains additive with service_role-only posture", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.store_partial_refund_provider_executions/);
    expect(sql).toMatch(/trusted_amount_minor > 0/);
    expect(sql).toMatch(/status in \(\s*'planned'/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/revoke all[\s\S]*from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute[\s\S]*to service_role/i);
    expect(sql).toMatch(/Terminal success is immutable/);
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/on delete cascade/i);
    expect(sql).not.toMatch(/\bgrant execute\b[\s\S]{0,80}\bto (anon|authenticated)\b/i);
    expect(sql).not.toMatch(/sk_live_|sk_test_|whsec_/);
  });
});

describe("P4 observability", () => {
  const base: PartialRefundProviderExecutionRecord = {
    executionId: "66666666-6666-4666-8666-666666666666",
    storeId: "11111111-1111-4111-8111-111111111111",
    ledgerId: "55555555-5555-4555-8555-555555555555",
    orderId: "22222222-2222-4222-8222-222222222222",
    paymentAttemptId: "33333333-3333-4333-8333-333333333333",
    captureEventId: "44444444-4444-4444-8444-444444444444",
    providerKind: "stripe",
    providerPaymentRef: "pi_obs",
    trustedAmountMinor: 100,
    currency: "USD",
    idempotencyKey: "prf-prov:55555555-5555-4555-8555-555555555555",
    status: "uncertain",
    providerRefundId: "re_obs",
    providerStatusSafe: "pending",
    failureCode: "provider_timeout",
    failureMessageSafe: "timeout",
    operatorUserId: null,
    operatorReasonSafe: null,
    startedAtIso: "2026-01-01T00:00:00.000Z",
    completedAtIso: null,
    lastLookupAtIso: "2026-01-01T00:05:00.000Z",
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:05:00.000Z",
  };

  it("derives LOOKUP vs SUBMIT from safe timestamps", () => {
    expect(deriveProviderMoneyLatestOperation(base)).toBe("LOOKUP");
    expect(
      deriveProviderMoneyLatestOperation({
        ...base,
        lastLookupAtIso: null,
        completedAtIso: "2026-01-01T00:02:00.000Z",
        status: "succeeded",
      })
    ).toBe("SUBMIT");
    expect(
      deriveProviderMoneyLatestOperation({
        ...base,
        status: "planned",
        startedAtIso: null,
        completedAtIso: null,
        lastLookupAtIso: null,
      })
    ).toBe("NONE");
  });

  it("audit view exposes idempotency + safe refs only", () => {
    const v = toProviderMoneyAuditView(base);
    expect(v.idempotencyKey).toMatch(/^prf-prov:/);
    expect(v.latestOperation).toBe("LOOKUP");
    expect(v.providerRefundId).toBe("re_obs");
    expect(JSON.stringify(v)).not.toMatch(/sk_live_|whsec_|card/i);
  });
});

describe("P4 checklist / plan docs exist", () => {
  it("test-mode dry-run checklist requires gate-off after run", () => {
    const src = read(DRY_RUN);
    expect(src).toMatch(/execution mode exactly `test`|EXECUTION_MODE.*test/i);
    expect(src).toMatch(/prf-prov:\{ledgerId\}/);
    expect(src).toMatch(/post-run gate returned OFF|gate.*OFF/i);
    expect(src).toMatch(/Do NOT perform|not performed in P4/i);
  });

  it("production prerequisites do not flip env in P4", () => {
    const src = read(PROD_CHECK);
    expect(src).toMatch(/execution mode exactly `production`/i);
    expect(src).toMatch(/emergency gate-off|gate.?off/i);
    expect(src).toMatch(/P4 must NOT|must not satisfy by flipping/i);
  });

  it("targeted apply plan targets 20260915 and forbids db push", () => {
    const src = read(APPLY_PLAN);
    expect(src).toMatch(/20260915_store_partial_refund_provider_money_execution_v1\.sql/);
    expect(src).toMatch(/No `db push`|do not run `db push`/i);
    expect(src).toMatch(/--include-all/);
    expect(src).toMatch(/Do NOT execute|not executed/i);
    expect(src).toMatch(/20260915/);
    expect(src).toMatch(/translation_studio_memory_identity_contract_align_v1/);
  });
});
