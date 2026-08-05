/**
 * Seller Live Payout Provider V1 — Slice S6 UI contract tests.
 * Source-level contracts for admin queue, attestation form, gate badge.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSellerLivePayoutProviderAllowed,
  buildSellerLivePayoutGateReadinessReport,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
} from "./index";
import {
  formatSafeLivePayoutAmountDisplay,
  projectSafeExecution,
  type SafeLivePayoutExecutionView,
} from "./actionSupport";
import type { SellerLivePayoutExecution } from "./executions";

const ROOT = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const PAGE = "app/admin/store/payouts/page.tsx";
const QUEUE = "app/components/store/AdminLivePayoutQueue.tsx";
const ATTEST = "app/components/store/AdminLivePayoutAttestForm.tsx";
const BADGE = "app/components/store/LivePayoutGateBadge.tsx";
const ADMIN_ACTIONS = "app/actions/storeAdminLivePayout.ts";

const STORE = "11111111-1111-4111-8111-111111111111";
const EXEC = "77777777-7777-4777-8777-777777777777";
const DEST = "66666666-6666-4666-8666-666666666666";

function baseExecution(
  overrides: Partial<SellerLivePayoutExecution> = {}
): SellerLivePayoutExecution {
  return {
    id: EXEC,
    storeId: STORE,
    captureEventId: "55555555-5555-4555-8555-555555555555",
    destinationId: DEST,
    providerId: "manual_ops_live",
    status: "awaiting_attestation",
    trustedAmountMinor: 5000,
    currency: "USD",
    providerRef: "mol-secret-ref",
    failureCode: null,
    failureMessageSafe: null,
    attestationDecision: null,
    attestationRef: "ops-ref-hidden",
    attestedAt: null,
    note: null,
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...overrides,
  };
}

function safeView(
  overrides: Partial<SafeLivePayoutExecutionView> = {}
): SafeLivePayoutExecutionView {
  return {
    ...projectSafeExecution(baseExecution()),
    destinationDisplayLabel: "Ops clearing •••• 42",
    orchestrationKey: "live-orch-key-s6-0001",
    paymentAttemptId: "33333333-3333-4333-8333-333333333333",
    ...overrides,
  };
}

describe("S6 admin page uses durable queue action", () => {
  it("loads queue via adminListLivePayoutExecutionsAction", () => {
    const page = read(PAGE);
    expect(page).toMatch(/adminListLivePayoutExecutionsAction/);
    expect(page).toMatch(/AdminLivePayoutQueue/);
    expect(page).toMatch(/LivePayoutGateBadge/);
    expect(page).toMatch(/assertPlatformAdminDb/);
    expect(page).toMatch(/data-mock-payout-diagnostics="secondary"/);
    // Durable queue is loaded from the S5 action result, not mock diagnostics.
    expect(page).toMatch(
      /listResult\.ok \? listResult\.executions : \[\]/
    );
    expect(page).toMatch(
      /executions=\{executions\}[\s\S]*liveControlsEnabled=\{liveControlsEnabled\}/
    );
  });

  it("keeps mock diagnostics secondary, not the primary live queue", () => {
    const page = read(PAGE);
    const queue = read(QUEUE);
    expect(queue).toMatch(/data-live-payout-queue="durable"/);
    expect(page).toMatch(/<details[\s\S]*data-mock-payout-diagnostics="secondary"/);
    expect(page).toMatch(/Developer: mock payout rails diagnostics/);
    // Primary section is durable queue component, not mock executions list as main.
    const durableIdx = page.indexOf("AdminLivePayoutQueue");
    const mockIdx = page.indexOf('data-mock-payout-diagnostics="secondary"');
    expect(durableIdx).toBeGreaterThan(-1);
    expect(mockIdx).toBeGreaterThan(durableIdx);
  });

  it("preserves platform-admin protection on the page", () => {
    const page = read(PAGE);
    expect(page).toMatch(/assertPlatformAdminDb/);
    expect(page).toMatch(/ADMIN_STORE_UNAUTHORIZED/);
    expect(page).toMatch(/getServerUser/);
    expect(page).not.toMatch(/getMembership/);
  });
});

describe("S6 UI action boundary — no direct DB/UEOS/booking/orchestrator", () => {
  it("queue and attest form do not call forbidden surfaces", () => {
    const queue = read(QUEUE);
    const attest = read(ATTEST);
    const badge = read(BADGE);
    const combined = `${queue}\n${attest}\n${badge}`;

    expect(combined).not.toMatch(/createClient|createLivePayoutServiceRoleClient/);
    expect(combined).not.toMatch(/\.from\(|\.rpc\(/);
    expect(combined).not.toMatch(/orchestrateSellerLivePayout/);
    expect(combined).not.toMatch(
      /submitPayoutBooking|failPayoutBooking|confirmPayoutBooking/
    );
    expect(combined).not.toMatch(/apply_store_payout_event/);
    expect(combined).not.toMatch(/ueos_post|postUeos|UEOS_/i);
    expect(combined).not.toMatch(/@supabase/);
  });

  it("attestation success routes to approved admin action", () => {
    const attest = read(ATTEST);
    expect(attest).toMatch(/adminAttestManualLivePayoutAction/);
    expect(attest).toMatch(/from ["'].*storeAdminLivePayout["']/);
  });

  it("failure routes to approved admin fail action", () => {
    const attest = read(ATTEST);
    expect(attest).toMatch(/adminFailLivePayoutAction/);
    expect(attest).toMatch(/data-live-payout-action="fail-approved-path"/);
  });

  it("page does not import orchestrator or booking helpers", () => {
    const page = read(PAGE);
    expect(page).not.toMatch(/orchestrateSellerLivePayout/);
    expect(page).not.toMatch(
      /submitPayoutBooking|failPayoutBooking|confirmPayoutBooking/
    );
    expect(page).not.toMatch(/apply_store_payout_event/);
  });
});

describe("S6 gate badge and control disabling", () => {
  it("badge exposes enabled/disabled/incomplete tones with redacted reasons", () => {
    const badge = read(BADGE);
    expect(badge).toMatch(/enabled/);
    expect(badge).toMatch(/disabled/);
    expect(badge).toMatch(/incomplete/);
    expect(badge).toMatch(/data-live-payout-gate/);
    expect(badge).toMatch(/SellerLivePayoutGateReadinessReport/);
    expect(badge).not.toMatch(/process\.env/);
    expect(badge).not.toMatch(/service.?role|sk_live|whsec_/i);
  });

  it("gate OFF disables live execution controls", () => {
    const queue = read(QUEUE);
    const attest = read(ATTEST);
    expect(queue).toMatch(/liveControlsEnabled/);
    expect(queue).toMatch(/data-live-payout-controls="queue-disabled"/);
    expect(attest).toMatch(/liveControlsEnabled/);
    expect(attest).toMatch(/data-live-payout-controls="disabled"/);
    expect(attest).toMatch(
      /Live payout controls are disabled while the production gate is off/
    );
  });

  it("readiness report stays redacted for UI", () => {
    const report = buildSellerLivePayoutGateReadinessReport({
      SELLER_LIVE_PAYOUTS_ENABLED: "false",
    });
    expect(report.ready).toBe(false);
    expect(report.issues.join(" ")).not.toMatch(/sk_|whsec|service_role/i);
    expect(JSON.stringify(report)).not.toMatch(/SECRET|password|token=/i);
  });
});

describe("S6 uncertain / completed behavior", () => {
  it("uncertain execution has no unsafe fail shortcut", () => {
    const attest = read(ATTEST);
    expect(attest).toMatch(/uncertain-reconciliation/);
    expect(attest).toMatch(/Reconciliation required/);
    expect(attest).toMatch(/Do not auto-fail/);
    // Uncertain branch must not render the fail-approved-path control.
    const uncertainBlock = attest.slice(
      attest.indexOf('data-live-payout-state="uncertain-reconciliation"'),
      attest.indexOf("if (!canAttest)")
    );
    expect(uncertainBlock).not.toMatch(
      /data-live-payout-action="fail-approved-path"/
    );
    expect(uncertainBlock).not.toMatch(/adminFailLivePayoutAction/);
    expect(uncertainBlock).toMatch(/attest-success-after-recon/);
  });

  it("completed execution is read-only", () => {
    const attest = read(ATTEST);
    expect(attest).toMatch(/data-live-payout-readonly="completed"/);
    expect(attest).toMatch(/Completed execution is read-only/);
    expect(attest).toMatch(/status === "succeeded" \|\| status === "failed"/);
  });
});

describe("S6 safe-field rendering contracts", () => {
  it("queue renders only approved safe fields", () => {
    const queue = read(QUEUE);
    expect(queue).toMatch(/amountDisplay/);
    expect(queue).toMatch(/destinationDisplayLabel/);
    expect(queue).toMatch(/failureCode/);
    expect(queue).toMatch(/failureMessageSafe/);
    expect(queue).toMatch(/providerId/);
    expect(queue).toMatch(/createdAt/);
    expect(queue).toMatch(/updatedAt/);
    expect(queue).not.toMatch(/providerRef/);
    expect(queue).not.toMatch(/attestationRef/);
    expect(queue).not.toMatch(/account_number|iban|routing|bank_account/i);
    expect(queue).not.toMatch(/service.?role|raw.?provider|payload/i);
  });

  it("safe projection omits unsafe fields and formats amount server-side", () => {
    const safe = safeView();
    expect(safe.amountDisplay).toBe(
      formatSafeLivePayoutAmountDisplay(5000, "USD")
    );
    expect(safe).not.toHaveProperty("providerRef");
    expect(safe).not.toHaveProperty("attestationRef");
    expect(JSON.stringify(safe)).not.toMatch(/mol-secret-ref/);
  });
});

describe("S6 unsupported providers not selectable", () => {
  it("page marks unsupported providers as blocked", () => {
    const page = read(PAGE);
    expect(page).toMatch(/"stripe_connect"/);
    expect(page).toMatch(/"wise"/);
    expect(page).toMatch(/"paypal"/);
    expect(page).toMatch(/data-live-payout-provider-blocked=\{id\}/);
    expect(page).toMatch(
      new RegExp(`data-live-payout-provider=\\{SELLER_LIVE_PAYOUT_V1_PROVIDER_ID\\}`)
    );
    expect(page).not.toMatch(/<select[\s\S]*stripe_connect/);
    expect(page).not.toMatch(/option.*wise|option.*paypal/i);
  });

  it("provider port still forbids unsupported ids", () => {
    expect(() =>
      assertSellerLivePayoutProviderAllowed("stripe_connect")
    ).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("wise")).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("paypal")).toThrow();
  });
});

describe("S6 RTL/LTR-safe markup contracts", () => {
  it("uses dir=auto or dir=ltr on user-facing and identifier fields", () => {
    const queue = read(QUEUE);
    const attest = read(ATTEST);
    expect(queue).toMatch(/dir="auto"/);
    expect(queue).toMatch(/dir="ltr"/);
    expect(attest).toMatch(/dir="auto"/);
  });
});

describe("S6 admin actions remain the only mutation boundary", () => {
  it("admin action module still gates platform admin and enrich path", () => {
    const admin = read(ADMIN_ACTIONS);
    expect(admin).toMatch(/assertPlatformAdminDb/);
    expect(admin).toMatch(/enrichAdminLivePayoutQueueRows/);
    expect(admin).toMatch(/adminAttestManualLivePayoutAction/);
    expect(admin).toMatch(/adminFailLivePayoutAction/);
    expect(admin).toMatch(/adminListLivePayoutExecutionsAction/);
  });
});

const SELLER_PAGE = "app/seller/store/page.tsx";
const SELLER_ELIG = "app/components/store/SellerPayoutEligibility.tsx";
const SELLER_DEST = "app/components/store/SellerPayoutDestinationForm.tsx";
const SELLER_REQ = "app/components/store/SellerPayoutRequestButton.tsx";
const SELLER_ACTIONS = "app/actions/storeSellerLivePayout.ts";

describe("S7 seller live payout UI contracts", () => {
  it("owner/manager wiring loads destinations and live gate context", () => {
    const page = read(SELLER_PAGE);
    expect(page).toMatch(/listMyStorePayoutDestinations/);
    expect(page).toMatch(/buildSellerLivePayoutGateReadinessReport/);
    expect(page).toMatch(/canManageStoreSettings/);
    expect(page).toMatch(/live:\s*liveContext/);
  });

  it("unauthorized store role does not receive payout controls without canManage", () => {
    const insights = read("app/components/store/SellerDashboardInsights.tsx");
    const elig = read(SELLER_ELIG);
    expect(insights).toMatch(/canManagePayouts=\{canManage\}/);
    expect(elig).toMatch(/canManagePayouts/);
    expect(elig).toMatch(/data-seller-payout-controls="hidden-role"/);
  });

  it("seller cannot self-verify destination and unsafe money fields are absent", () => {
    const dest = read(SELLER_DEST);
    const req = read(SELLER_REQ);
    expect(dest).toMatch(/upsertSellerPayoutDestinationAction/);
    expect(dest).toMatch(/cannot self-verify/i);
    expect(dest).not.toMatch(/data-destination-field="verification/);
    expect(dest + req).not.toMatch(/amountMinor|settlement_amount|commission/);
    expect(req).toMatch(/requestSellerLivePayoutAction/);
    expect(req).not.toMatch(/expectedCurrency/);
  });

  it("seller UI never calls DB/UEOS/booking/orchestrator directly", () => {
    const combined = [
      read(SELLER_ELIG),
      read(SELLER_DEST),
      read(SELLER_REQ),
    ].join("\n");
    expect(combined).not.toMatch(/createClient|@supabase/);
    expect(combined).not.toMatch(/\.from\(|\.rpc\(/);
    expect(combined).not.toMatch(/orchestrateSellerLivePayout/);
    expect(combined).not.toMatch(
      /submitPayoutBooking|failPayoutBooking|confirmPayoutBooking/
    );
    expect(combined).not.toMatch(/apply_store_payout_event|ueos_post|postUeos/i);
  });

  it("unsupported providers stay blocked and not selectable in seller form", () => {
    const dest = read(SELLER_DEST);
    expect(dest).toMatch(/SELLER_LIVE_PAYOUT_V1_PROVIDER_ID/);
    expect(dest).toMatch(/not\s+selectable/i);
    expect(dest).not.toMatch(/<option[^>]+stripe_connect/i);
    expect(dest).not.toMatch(/<option[^>]+wise/i);
    expect(dest).not.toMatch(/<option[^>]+paypal/i);
    expect(() =>
      assertSellerLivePayoutProviderAllowed("stripe_connect")
    ).toThrow();
  });

  it("RTL/LTR-safe markup on seller destination and request controls", () => {
    const dest = read(SELLER_DEST);
    const req = read(SELLER_REQ);
    expect(dest).toMatch(/dir="auto"/);
    expect(dest).toMatch(/dir="ltr"/);
    expect(req).toMatch(/dir="auto"/);
    expect(req).toMatch(/dir="ltr"/);
  });

  it("seller action module remains the mutation boundary", () => {
    const actions = read(SELLER_ACTIONS);
    expect(actions).toMatch(/canManageStoreSettings/);
    expect(actions).toMatch(/requestSellerLivePayoutAction/);
    expect(actions).toMatch(/upsertSellerPayoutDestinationAction/);
    expect(actions).not.toMatch(/apply_store_payout_event/);
  });
});
