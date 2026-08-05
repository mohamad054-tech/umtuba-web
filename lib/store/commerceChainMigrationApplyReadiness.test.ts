/**
 * Focused tests — Commerce Chain Verification & Migration Apply Readiness V1.
 * Static fail-closed checks only. Does not inspect or mutate any database.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(__dirname, "../..");
const MIGRATIONS = join(ROOT, "supabase/migrations");
const DOC =
  "docs/store/implementation/COMMERCE_CHAIN_MIGRATION_APPLY_READINESS_V1.md";
const PREFLIGHT_DOC =
  "docs/store/implementation/COMMERCE_CHAIN_REMOTE_MIGRATION_PREFLIGHT_V1.md";
const SCRIPT =
  "scripts/verify-commerce-chain-migration-apply-readiness.mjs";

const APPLY_ORDER = [
  "20260889_store_digital_entitlement_revoke_on_refund_v1.sql",
  "20260890_store_commission_decomposition_bridge_apply_v1.sql",
  "20260891_store_commission_policy_activation_v1.sql",
] as const;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("Commerce chain migration apply readiness — artifacts", () => {
  it("ships readiness doc, remote preflight doc, and static verifier", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, PREFLIGHT_DOC))).toBe(true);
    expect(existsSync(join(ROOT, SCRIPT))).toBe(true);
    const doc = read(DOC);
    expect(doc).toMatch(/READY_FOR_SEPARATE_REMOTE_APPLY_GO|NOT_READY/);
    expect(doc).toMatch(/DO NOT RUN YET/);
    expect(doc).toMatch(/NOT MODIFIED/);
    expect(doc).toMatch(/20260889/);
    expect(doc).toMatch(/20260890/);
    expect(doc).toMatch(/20260891/);
    expect(doc).toMatch(/fded934|obsolete/i);
    const preflight = read(PREFLIGHT_DOC);
    expect(preflight).toMatch(/tgucwnjwoyeqoxqaxmew/);
    expect(preflight).toMatch(/NOT_READY_FOR_REMOTE_APPLY|READY_FOR_REMOTE_APPLY_GO/);
    expect(preflight).toMatch(/read-only|SELECT/i);
  });
});

describe("Commerce chain migration apply readiness — chain integrity", () => {
  it("keeps 89/90/91 unique and ordered; 20260887 is notifications only", () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"));
    for (const f of APPLY_ORDER) {
      expect(files).toContain(f);
    }
    expect(files).toContain(
      "20260887_store_commerce_transactional_notifications_v1.sql"
    );
    expect(files).not.toContain(
      "20260887_store_commission_policy_activation_v1.sql"
    );

    for (const prefix of ["20260889", "20260890", "20260891", "20260887"]) {
      const hits = files.filter((f) => f.startsWith(prefix));
      expect(hits).toHaveLength(1);
    }

    const i89 = files.indexOf(APPLY_ORDER[0]);
    const i90 = files.indexOf(APPLY_ORDER[1]);
    const i91 = files.indexOf(APPLY_ORDER[2]);
    expect(i89).toBeLessThan(i90);
    expect(i90).toBeLessThan(i91);

    const n87 = read(
      "supabase/migrations/20260887_store_commerce_transactional_notifications_v1.sql"
    );
    expect(n87).toMatch(/create_store_commerce_notification/);
    expect(n87).not.toMatch(/activate_store_commission_policy/);
  });

  it("has exactly one activate_store_commission_policy definition in 20260891", () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"));
    const defs = files.filter((f) =>
      /create\s+or\s+replace\s+function\s+public\.activate_store_commission_policy/i.test(
        read(`supabase/migrations/${f}`)
      )
    );
    expect(defs).toEqual([
      "20260891_store_commission_policy_activation_v1.sql",
    ]);
  });

  it("matches TS RPC names/args to SQL for revoke, decomposition, activation", () => {
    const m89 = read(`supabase/migrations/${APPLY_ORDER[0]}`);
    const m90 = read(`supabase/migrations/${APPLY_ORDER[1]}`);
    const m91 = read(`supabase/migrations/${APPLY_ORDER[2]}`);
    const revokeTs = read("lib/store/digitalEntitlementRevoke.ts");
    const decompTs = read("lib/store/commissionDecompositionBridgeApply.ts");
    const actTs = read("lib/store/commissionPolicyActivation.ts");

    expect(m89).toMatch(/revoke_store_digital_entitlements_after_refund/);
    expect(revokeTs).toMatch(/revoke_store_digital_entitlements_after_refund/);
    expect(revokeTs).toMatch(/p_payment_attempt_id/);
    expect(revokeTs).toMatch(/p_event_key/);
    expect(revokeTs).toMatch(/p_correlation_id/);

    expect(m90).toMatch(/apply_store_commission_decomposition_after_capture/);
    expect(m90).toMatch(/mark_store_commission_decomposition_after_refund/);
    expect(m90).toMatch(/get_store_commission_decomposition_for_attempt/);
    expect(m90).toMatch(/resolve_store_commission_policy/);
    expect(decompTs).toMatch(/p_payment_attempt_id/);
    expect(decompTs).toMatch(/p_event_key/);
    expect(decompTs).toMatch(/p_correlation_id/);

    expect(m91).toMatch(/activate_store_commission_policy/);
    expect(m91).toMatch(/deactivate_store_commission_policy/);
    expect(m91).toMatch(/store_commission_policies_one_active_per_currency_uidx/);
    expect(actTs).toMatch(/p_policy_code/);
    expect(actTs).toMatch(/p_version/);
    expect(actTs).toMatch(/p_event_key/);
    expect(actTs).toMatch(/p_correlation_id/);
  });

  it("wires capture apply and refund path without activating policies on refund", () => {
    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    const refund = read("lib/store/fullOrderRefundPath.ts");
    expect(apply).toMatch(/applyCommissionDecompositionAfterTrustedCapture/);
    expect(refund).toMatch(/revokeDigitalEntitlementsAfterTrustedRefund/);
    expect(refund).toMatch(/markCommissionDecompositionAfterTrustedRefund/);
    expect(refund).not.toMatch(/activate_store_commission_policy/);
  });
});

describe("Commerce chain migration apply readiness — verifier script", () => {
  it("passes static verification (exit 0)", () => {
    const out = execFileSync(
      process.execPath,
      [join(ROOT, SCRIPT)],
      { encoding: "utf8" }
    );
    expect(out).toMatch(/PASS — repository migration readiness/);
    expect(out).toMatch(/NOT INSPECTED \/ NOT MODIFIED/);
    expect(out).not.toMatch(/^FAIL/m);
  });
});
