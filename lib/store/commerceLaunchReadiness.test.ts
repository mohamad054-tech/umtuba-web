/**
 * Commerce Launch Readiness V1 — static audit (no network, no secrets).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase", "migrations");

const REQUIRED_LAUNCH_MIGS = [
  "20260822_ueos_foundation_v1.sql",
  "20260823_store_payment_outcome_sync_v1.sql",
  "20260824_store_merchant_settlement_foundation_v1.sql",
  "20260869_store_marketplace_supplier_seller_foundation_v1.sql",
  "20260870_store_marketplace_listing_checkout_alignment_v1.sql",
  "20260875_store_marketplace_listing_provenance_hardening_v1.sql",
  "20260876_store_live_payment_capture_adapter_v1.sql",
  "20260877_store_digital_entitlement_grant_v1.sql",
  "20260878_store_digital_access_delivery_v1.sql",
  "20260879_store_seller_digital_product_asset_upload_v1.sql",
  "20260880_store_digital_product_versioning_update_delivery_v1.sql",
  "20260881_store_seller_payout_foundation_v1.sql",
  "20260882_store_seller_payout_read_model_v1.sql",
  "20260883_store_settlement_payout_reconciliation_read_v1.sql",
  "20260884_store_commission_policy_foundation_v1.sql",
  "20260885_store_catalog_category_taxonomy_seed_v1.sql",
  "20260886_store_supplier_listing_create_hardening_v1.sql",
  "20260887_store_commerce_transactional_notifications_v1.sql",
  "20260888_store_refund_operations_surface_v1.sql",
  "20260889_store_digital_entitlement_revoke_on_refund_v1.sql",
  "20260890_store_commission_decomposition_bridge_apply_v1.sql",
  "20260891_store_commission_policy_activation_v1.sql",
] as const;

describe("Commerce Launch Readiness V1 — static audit", () => {
  it("ships checklist, runbook, and readiness docs", () => {
    for (const rel of [
      "docs/store/operations/COMMERCE_LAUNCH_READINESS_CHECKLIST_V1.md",
      "docs/store/operations/COMMERCE_LAUNCH_ROLLBACK_RUNBOOK_V1.md",
      "docs/store/operations/COMMERCE_LAUNCH_READINESS_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("requires launch migration files present (no renumber)", () => {
    for (const name of REQUIRED_LAUNCH_MIGS) {
      expect(existsSync(join(MIGRATIONS, name)), name).toBe(true);
    }
  });

  it("has no duplicate timestamp prefixes in 20260869–20260891 band", () => {
    const names = readdirSync(MIGRATIONS).filter((n) =>
      /^202608(6[9]|7\d|8\d|9[01])_/.test(n)
    );
    const prefixes = names.map((n) => n.slice(0, 8));
    const counts = new Map<string, number>();
    for (const p of prefixes) counts.set(p, (counts.get(p) ?? 0) + 1);
    const dupes = [...counts.entries()].filter(([, c]) => c > 1);
    expect(dupes).toEqual([]);
  });

  it("keeps live Stripe capture digital-only (physical launch disabled)", () => {
    const sql = readFileSync(
      join(MIGRATIONS, "20260876_store_live_payment_capture_adapter_v1.sql"),
      "utf8"
    );
    expect(sql).toMatch(/Live Stripe capture is limited to digital checkout orders/);
  });

  it("documents physicalLaunchGated for physical inventory facts", () => {
    const src = readFileSync(
      join(ROOT, "lib/store/sellerInventoryAvailabilityFoundation.ts"),
      "utf8"
    );
    expect(src).toMatch(/physicalLaunchGated:\s*true/);
  });

  it("webhook accepts only trusted checkout session success events", () => {
    const route = readFileSync(
      join(ROOT, "app/api/store/payments/stripe/webhook/route.ts"),
      "utf8"
    );
    expect(route).toContain("checkout.session.completed");
    expect(route).toContain("checkout.session.async_payment_succeeded");
    expect(route).toContain("verifyStripeWebhookEvent");
  });

  it("wires revoke after trusted refund path without editing sensitive module here", () => {
    const refund = readFileSync(
      join(ROOT, "lib/store/fullOrderRefundPath.ts"),
      "utf8"
    );
    expect(refund).toMatch(/revokeDigitalEntitlementsAfterTrustedRefund/);
  });

  it("keeps commerce confirm kill switch + DB gate in safety module", () => {
    const safety = readFileSync(
      join(ROOT, "lib/store/commerceSafety.ts"),
      "utf8"
    );
    expect(safety).toContain("STORE_COMMERCE_CONFIRM_KILL_SWITCH");
  });
});
