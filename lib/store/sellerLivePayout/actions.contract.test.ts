/**
 * Seller Live Payout Provider V1 — Slice S5 action contract tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ROOT = join(__dirname, "../../..");
const SELLER_ACTIONS = "app/actions/storeSellerLivePayout.ts";
const ADMIN_ACTIONS = "app/actions/storeAdminLivePayout.ts";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const DEST = "66666666-6666-4666-8666-666666666666";
const EXEC = "77777777-7777-4777-8777-777777777777";
const ORCH = "live-orch-key-s5-0001";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../supabase/server", () => ({
  getServerUser: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("../adminAuth", () => ({
  assertPlatformAdminDb: vi.fn(),
}));

vi.mock("../sellerStore", () => ({
  getMembership: vi.fn(),
}));

vi.mock("./actionSupport", async () => {
  const actual = await vi.importActual<typeof import("./actionSupport")>(
    "./actionSupport"
  );
  return {
    ...actual,
    createLivePayoutServiceRoleClient: vi.fn(() => ({
      ok: true as const,
      supabase: { rpc: vi.fn() } as never,
    })),
  };
});

vi.mock("./index", async () => {
  const actual = await vi.importActual<typeof import("./index")>("./index");
  return {
    ...actual,
    upsertMyStorePayoutDestination: vi.fn(),
    listMyStorePayoutDestinations: vi.fn(),
    orchestrateSellerLivePayoutSubmit: vi.fn(),
    orchestrateSellerLivePayoutResolveAttestation: vi.fn(),
  };
});

import { getServerUser, createClient } from "../../supabase/server";
import { assertPlatformAdminDb } from "../adminAuth";
import { getMembership } from "../sellerStore";
import {
  assertNoSensitiveActionPayload,
  projectSafeExecution,
  projectSafeOrchestratorResult,
  rejectClientLivePayoutActionFields,
} from "./actionSupport";
import type { SellerLivePayoutExecution } from "./executions";
import {
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  assertSellerLivePayoutProviderAllowed,
  upsertMyStorePayoutDestination,
  listMyStorePayoutDestinations,
  orchestrateSellerLivePayoutSubmit,
  orchestrateSellerLivePayoutResolveAttestation,
} from "./index";
import {
  upsertSellerPayoutDestinationAction,
  listSellerPayoutDestinationsAction,
  requestSellerLivePayoutAction,
} from "../../../app/actions/storeSellerLivePayout";
import {
  adminListLivePayoutExecutionsAction,
  adminAttestManualLivePayoutAction,
  adminFailLivePayoutAction,
} from "../../../app/actions/storeAdminLivePayout";

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
    failureCode: "attestation_required",
    failureMessageSafe: null,
    attestationDecision: null,
    attestationRef: "ops-ref-hidden",
    attestedAt: null,
    note: "awaiting",
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("S5 action source contracts", () => {
  it("ships seller and admin action modules with auth gates", () => {
    const seller = read(SELLER_ACTIONS);
    const admin = read(ADMIN_ACTIONS);
    expect(seller).toMatch(/"use server"/);
    expect(admin).toMatch(/"use server"/);
    expect(seller).toMatch(/getServerUser/);
    expect(seller).toMatch(/getMembership/);
    expect(seller).toMatch(/canManageStoreSettings/);
    expect(seller).toMatch(/orchestrateSellerLivePayoutSubmit/);
    expect(admin).toMatch(/assertPlatformAdminDb/);
    expect(admin).toMatch(/orchestrateSellerLivePayoutResolveAttestation/);
    expect(admin).toMatch(/admin_attest_store_live_payout_execution/);
    expect(admin).toMatch(/admin_list_store_live_payout_executions/);
  });

  it("does not call UEOS or payout foundation RPCs from the action layer", () => {
    const seller = read(SELLER_ACTIONS);
    const admin = read(ADMIN_ACTIONS);
    const combined = seller + "\n" + admin;
    expect(combined).not.toMatch(/apply_store_payout_event/);
    expect(combined).not.toMatch(/ueos_post|postUeos|UEOS_/i);
    expect(combined).not.toMatch(
      /submitPayoutBooking|failPayoutBooking|confirmPayoutBooking/
    );
    expect(combined).not.toMatch(/SELLER_LIVE_PAYOUTS_ENABLED\s*=/);
    expect(combined).not.toMatch(/process\.env\.[A-Z_]+\s*=/);
  });

  it("keeps unsupported providers blocked at port layer", () => {
    expect(() =>
      assertSellerLivePayoutProviderAllowed("stripe_connect")
    ).toThrow(/forbidden|not allowed/i);
    expect(() => assertSellerLivePayoutProviderAllowed("wise")).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("paypal")).toThrow();
  });
});

describe("S5 client-money and safe projection helpers", () => {
  it("rejects client money / settlement / self-verify fields", () => {
    expect(
      rejectClientLivePayoutActionFields({
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        destinationId: DEST,
        orchestrationKey: ORCH,
      }).ok
    ).toBe(true);
    expect(rejectClientLivePayoutActionFields({ amountMinor: 100 }).ok).toBe(
      false
    );
    expect(rejectClientLivePayoutActionFields({ amount: 1 }).ok).toBe(false);
    expect(rejectClientLivePayoutActionFields({ fee: 1 }).ok).toBe(false);
    expect(rejectClientLivePayoutActionFields({ commission: 1 }).ok).toBe(
      false
    );
    expect(
      rejectClientLivePayoutActionFields({ settlement_amount: 1 }).ok
    ).toBe(false);
    expect(
      rejectClientLivePayoutActionFields({
        verificationState: "verified",
      }).ok
    ).toBe(false);
    expect(rejectClientLivePayoutActionFields({ verified: true }).ok).toBe(
      false
    );
  });

  it("omits providerRef/attestationRef from safe projections", () => {
    const safe = projectSafeExecution(baseExecution());
    expect(safe).not.toHaveProperty("providerRef");
    expect(safe).not.toHaveProperty("attestationRef");
    expect(assertNoSensitiveActionPayload(safe)).toBe(true);

    const orchSafe = projectSafeOrchestratorResult({
      ok: true,
      phase: "awaiting_attestation",
      replayed: false,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      captureEventId: "55555555-5555-4555-8555-555555555555",
      trustedAmountMinor: 5000,
      currency: "USD",
      payoutState: "IN_TRANSIT",
      orchestrationKey: ORCH,
      execution: baseExecution(),
      providerRef: "mol-secret-ref",
      bookingEventKey: `${ORCH}:submit`,
      note: "ok",
    });
    expect(orchSafe.ok).toBe(true);
    if (!orchSafe.ok) return;
    expect(orchSafe).not.toHaveProperty("providerRef");
    expect(orchSafe.orchestrationKey).toBe(ORCH);
    expect(assertNoSensitiveActionPayload(orchSafe)).toBe(true);
  });
});

describe("S5 seller actions — auth and money", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue({} as never);
  });

  it("unauthenticated seller action denied", async () => {
    vi.mocked(getServerUser).mockResolvedValue(null);
    const res = await upsertSellerPayoutDestinationAction({
      storeId: STORE,
      currency: "USD",
      displayLabel: "Ops clearing •••• 42",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.requiresAuth).toBe(true);
  });

  it("non-owner/non-manager seller denied", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("viewer");
    const res = await requestSellerLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      destinationId: DEST,
      orchestrationKey: ORCH,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toMatch(/owners or managers/i);
  });

  it("owner/manager destination upsert allowed", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("owner");
    vi.mocked(upsertMyStorePayoutDestination).mockResolvedValue({
      ok: true,
      destination: {
        id: DEST,
        storeId: STORE,
        providerId: "manual_ops_live",
        currency: "USD",
        displayLabel: "Ops clearing •••• 42",
        verificationState: "pending_review",
        isActive: true,
        createdAt: "2026-08-05T00:00:00Z",
        updatedAt: "2026-08-05T00:00:00Z",
      },
    });
    const res = await upsertSellerPayoutDestinationAction({
      storeId: STORE,
      currency: "USD",
      displayLabel: "Ops clearing •••• 42",
      requestReview: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.destination.displayLabel).toBe("Ops clearing •••• 42");
    expect(res.destination).not.toHaveProperty("account_number");
  });

  it("seller self-verification rejected", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("manager");
    const res = await upsertSellerPayoutDestinationAction({
      storeId: STORE,
      currency: "USD",
      displayLabel: "Ops clearing •••• 42",
      // @ts-expect-error intentional self-verify probe
      verificationState: "verified",
    });
    expect(res.ok).toBe(false);
    expect(upsertMyStorePayoutDestination).not.toHaveBeenCalled();
  });

  it("unsafe destination label rejected", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("owner");
    const res = await upsertSellerPayoutDestinationAction({
      storeId: STORE,
      currency: "USD",
      displayLabel: "123456789012",
    });
    expect(res.ok).toBe(false);
    expect(upsertMyStorePayoutDestination).not.toHaveBeenCalled();
  });

  it("seller request rejects client money fields", async () => {
    const res = await requestSellerLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      destinationId: DEST,
      orchestrationKey: ORCH,
      // @ts-expect-error intentional money probe
      amountMinor: 9999,
    });
    expect(res.ok).toBe(false);
    expect(orchestrateSellerLivePayoutSubmit).not.toHaveBeenCalled();
  });

  it("seller request passes identifiers only to orchestrator and preserves idempotency key", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("owner");
    vi.mocked(orchestrateSellerLivePayoutSubmit).mockResolvedValue({
      ok: true,
      phase: "awaiting_attestation",
      replayed: false,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      captureEventId: "55555555-5555-4555-8555-555555555555",
      trustedAmountMinor: 5000,
      currency: "USD",
      payoutState: "IN_TRANSIT",
      orchestrationKey: ORCH,
      execution: baseExecution(),
      providerRef: "mol-ref",
      bookingEventKey: `${ORCH}:submit`,
      note: "awaiting",
    });

    const res = await requestSellerLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      destinationId: DEST,
      orchestrationKey: ORCH,
      expectedCurrency: "USD",
    });
    expect(res.ok).toBe(true);
    expect(orchestrateSellerLivePayoutSubmit).toHaveBeenCalledWith(
      expect.anything(),
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        destinationId: DEST,
        orchestrationKey: ORCH,
        expectedCurrency: "USD",
      }
    );
    const callArg = vi.mocked(orchestrateSellerLivePayoutSubmit).mock
      .calls[0]?.[1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty("amountMinor");
    expect(callArg).not.toHaveProperty("amount");
    expect(callArg.orchestrationKey).toBe(ORCH);
    if (res.ok) {
      expect(res).not.toHaveProperty("providerRef");
      expect(res.orchestrationKey).toBe(ORCH);
    }
  });

  it("gate disabled returns safe failure from orchestrator path", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("owner");
    vi.mocked(orchestrateSellerLivePayoutSubmit).mockResolvedValue({
      ok: false,
      phase: "blocked",
      code: "gate_incomplete",
      message:
        "Seller live payouts are unavailable until the live payout gate is satisfied.",
    });
    const res = await requestSellerLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      destinationId: DEST,
      orchestrationKey: ORCH,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toMatch(/gate|unavailable/i);
    const blob = JSON.stringify(res).toLowerCase();
    expect(blob).not.toContain("sk_" + "live_");
    expect(blob).not.toContain("service_role");
  });

  it("list destinations requires owner/manager", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(getMembership).mockResolvedValue("owner");
    vi.mocked(listMyStorePayoutDestinations).mockResolvedValue({
      ok: true,
      destinations: [],
    });
    const res = await listSellerPayoutDestinationsAction(STORE);
    expect(res.ok).toBe(true);
  });
});

describe("S5 admin actions — auth and orchestrator routing", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn(async () => ({
        data: { ok: true, executions: [] },
        error: null,
      })),
    } as never);
  });

  it("unauthenticated admin action denied", async () => {
    vi.mocked(getServerUser).mockResolvedValue(null);
    const res = await adminListLivePayoutExecutionsAction({});
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.requiresAuth).toBe(true);
  });

  it("non-admin admin action denied", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(false);
    const res = await adminAttestManualLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      executionId: EXEC,
      orchestrationKey: ORCH,
      decision: "succeeded",
      attestationRef: "ops-1",
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toMatch(/platform admin/i);
  });

  it("admin list authorized", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "admin1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    const res = await adminListLivePayoutExecutionsAction({
      status: "awaiting_attestation",
      storeId: STORE,
      limit: 10,
    });
    expect(res.ok).toBe(true);
  });

  it("admin attestation authorized and routed through orchestrator", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "admin1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn(async (fn: string) => {
        expect(fn).toBe("admin_attest_store_live_payout_execution");
        return { data: { ok: true }, error: null };
      }),
    } as never);
    vi.mocked(orchestrateSellerLivePayoutResolveAttestation).mockResolvedValue({
      ok: true,
      phase: "completed",
      replayed: false,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      captureEventId: "55555555-5555-4555-8555-555555555555",
      trustedAmountMinor: 5000,
      currency: "USD",
      payoutState: "COMPLETED",
      orchestrationKey: ORCH,
      execution: baseExecution({ status: "succeeded" }),
      providerRef: "mol-ref",
      bookingEventKey: `${ORCH}:confirm`,
      note: "confirmed",
    });

    const res = await adminAttestManualLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      executionId: EXEC,
      orchestrationKey: ORCH,
      decision: "succeeded",
      attestationRef: "ops-ref-9",
    });
    expect(res.ok).toBe(true);
    expect(orchestrateSellerLivePayoutResolveAttestation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        executionId: EXEC,
        orchestrationKey: ORCH,
        decision: "succeeded",
      })
    );
    if (res.ok) {
      expect(res).not.toHaveProperty("providerRef");
    }
  });

  it("admin fail authorized and routed through approved path", async () => {
    vi.mocked(getServerUser).mockResolvedValue({ id: "admin1" } as never);
    vi.mocked(assertPlatformAdminDb).mockResolvedValue(true);
    vi.mocked(orchestrateSellerLivePayoutResolveAttestation).mockResolvedValue({
      ok: true,
      phase: "failed",
      replayed: false,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      captureEventId: "55555555-5555-4555-8555-555555555555",
      trustedAmountMinor: 5000,
      currency: "USD",
      payoutState: "NONE",
      orchestrationKey: ORCH,
      execution: baseExecution({ status: "failed" }),
      providerRef: null,
      bookingEventKey: `${ORCH}:fail`,
      note: "failed",
    });
    const res = await adminFailLivePayoutAction({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      executionId: EXEC,
      orchestrationKey: ORCH,
    });
    expect(res.ok).toBe(true);
    expect(orchestrateSellerLivePayoutResolveAttestation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ decision: "failed", orchestrationKey: ORCH })
    );
  });
});
