/**
 * Focused tests — Commerce Commission Policy Activation V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  activateCommissionPolicy,
  buildCommissionPolicyActivateEventKey,
  buildCommissionPolicyDeactivateEventKey,
  COMMISSION_POLICY_ACTIVATION_ID,
  deactivateCommissionPolicy,
  STORE_COMMISSION_POLICY_ACTIVATE_RPC,
  STORE_COMMISSION_POLICY_DEACTIVATE_RPC,
} from "./commissionPolicyActivation";
import {
  selectCommissionPolicy,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";
import { buildCommissionDecompositionApplyEventKey } from "./commissionDecompositionBridgeApply";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260891_store_commission_policy_activation_v1.sql";
const CORR = "commission-activation-corr-0001";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function policy(
  overrides: Partial<CommissionPolicyContract> = {}
): CommissionPolicyContract {
  return {
    policyCode: "store.default.commission",
    version: 1,
    status: "active",
    currency: "USD",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    basisKind: "grand_total",
    lines: [
      { role: "platform", bps: 1000 },
      { role: "seller", bps: 9000 },
    ],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Commission policy activation — migration contracts", () => {
  it("ships 20260891 with activate/deactivate RPCs and one-active index", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260891_store_commission_policy_activation_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /store_commission_policies_one_active_per_currency_uidx/
    );
    expect(sql).toMatch(/activate_store_commission_policy/);
    expect(sql).toMatch(/deactivate_store_commission_policy/);
    expect(sql).toMatch(/store_commission_policy_activation_events/);
    expect(sql).toMatch(/ambiguous active commission policies for currency/);
    expect(sql).toMatch(/status in \('active', 'superseded'\)/);
    expect(sql).toMatch(
      /grant execute on function public\.activate_store_commission_policy\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.activate_store_commission_policy\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).not.toMatch(/marketer|store_id|payout_execution/i);
  });
});

describe("Commission policy activation — helpers", () => {
  it("builds deterministic event keys", () => {
    expect(
      buildCommissionPolicyActivateEventKey({
        policyCode: "Store.Default.Commission",
        version: 2,
        nonce: "op-001",
      })
    ).toBe("commission:activate:store.default.commission:v2:op-001");
    expect(
      buildCommissionPolicyDeactivateEventKey({
        policyCode: "store.default.commission",
        version: 2,
        nonce: "op-002",
      })
    ).toBe("commission:deactivate:store.default.commission:v2:op-002");
    expect(COMMISSION_POLICY_ACTIVATION_ID).toBe(
      "commerce.revenue.commission_policy_activation_v1"
    );
  });

  it("activates via RPC and replays duplicate event_key", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          action: "activate",
          policy_code: "store.default.commission",
          policy_version: 1,
          currency: "USD",
          from_status: "draft",
          to_status: "active",
          superseded_policy_code: null,
          superseded_policy_version: null,
        },
        error: null,
      })
    );
    const eventKey = buildCommissionPolicyActivateEventKey({
      policyCode: "store.default.commission",
      version: 1,
      nonce: "act-1",
    });
    const first = await activateCommissionPolicy(
      { rpc } as never,
      {
        policyCode: "store.default.commission",
        version: 1,
        eventKey,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("activated");
    if (first.status === "activated") {
      expect(first.replayed).toBe(false);
      expect(first.toStatus).toBe("active");
    }
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_COMMISSION_POLICY_ACTIVATE_RPC,
    ]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_policy_code: "store.default.commission",
      p_version: 1,
      p_event_key: eventKey,
      p_correlation_id: CORR,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        action: "activate",
        policy_code: "store.default.commission",
        policy_version: 1,
        currency: "USD",
        from_status: "draft",
        to_status: "active",
      },
      error: null,
    } as never);
    const second = await activateCommissionPolicy(
      { rpc } as never,
      {
        policyCode: "store.default.commission",
        version: 1,
        eventKey,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("activated");
    if (second.status === "activated") expect(second.replayed).toBe(true);
  });

  it("fails closed on invalid activation inputs and RPC errors", async () => {
    const badVersion = await activateCommissionPolicy(
      { rpc: vi.fn() } as never,
      {
        policyCode: "store.default.commission",
        version: 0,
        eventKey: "commission:activate:bad:v0:x",
        correlationId: CORR,
      }
    );
    expect(badVersion.status).toBe("failed");

    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "commission policy activation requires status=draft (found superseded)",
      },
    }));
    const invalid = await activateCommissionPolicy(
      { rpc } as never,
      {
        policyCode: "store.default.commission",
        version: 1,
        eventKey: "commission:activate:store.default.commission:v1:bad",
        correlationId: CORR,
      }
    );
    expect(invalid.status).toBe("failed");
  });

  it("deactivates via RPC without inventing a replacement policy", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          action: "deactivate",
          policy_code: "store.default.commission",
          policy_version: 1,
          currency: "USD",
          from_status: "active",
          to_status: "disabled",
        },
        error: null,
      })
    );
    const result = await deactivateCommissionPolicy(
      { rpc } as never,
      {
        policyCode: "store.default.commission",
        version: 1,
        eventKey: buildCommissionPolicyDeactivateEventKey({
          policyCode: "store.default.commission",
          version: 1,
          nonce: "deact-1",
        }),
        correlationId: CORR,
      }
    );
    expect(result.status).toBe("deactivated");
    if (result.status === "deactivated") {
      expect(result.toStatus).toBe("disabled");
    }
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_COMMISSION_POLICY_DEACTIVATE_RPC,
    ]);
  });
});

describe("Commission policy activation — historical + capture contracts", () => {
  it("preserves historical superseded version for past transaction times", () => {
    const selected = selectCommissionPolicy({
      currency: "USD",
      at: "2026-02-01T00:00:00.000Z",
      policies: [
        policy({
          version: 1,
          status: "superseded",
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          effectiveTo: "2026-03-01T00:00:00.000Z",
        }),
        policy({
          version: 2,
          status: "active",
          effectiveFrom: "2026-03-01T00:00:00.000Z",
          effectiveTo: null,
        }),
      ],
    });
    expect(selected.ok).toBe(true);
    if (selected.ok) {
      expect(selected.policy.version).toBe(1);
      expect(selected.policy.status).toBe("superseded");
    }
  });

  it("capture uses current active policy; decomposition stores policy reference key", () => {
    const now = selectCommissionPolicy({
      currency: "USD",
      at: "2026-06-01T00:00:00.000Z",
      policies: [
        policy({
          version: 1,
          status: "superseded",
          effectiveTo: "2026-03-01T00:00:00.000Z",
        }),
        policy({
          version: 2,
          status: "active",
          effectiveFrom: "2026-03-01T00:00:00.000Z",
        }),
      ],
    });
    expect(now.ok && now.policy.version).toBe(2);

    const captureKey = "stripe:pi_activation_capture_key_v1:captured";
    expect(buildCommissionDecompositionApplyEventKey(captureKey)).toBe(
      `${captureKey}:commission`
    );

    const applySql = read(
      "supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql"
    );
    expect(applySql).toMatch(/policy_code/);
    expect(applySql).toMatch(/policy_version/);
    expect(applySql).toMatch(/resolve_store_commission_policy/);

    const refundPath = read("lib/store/fullOrderRefundPath.ts");
    expect(refundPath).toMatch(/markCommissionDecompositionAfterTrustedRefund/);
    expect(refundPath).not.toMatch(/activate_store_commission_policy/);
  });

  it("keeps activation server-only and does not redesign payout nets", () => {
    const src = read("lib/store/commissionPolicyActivation.ts");
    expect(src).toMatch(/service-role|Service-only|Server-only/i);
    expect(src).not.toMatch(/stripe\.|Refund\.create|Payout\.create/i);
    expect(read("lib/store/commissionPolicyFoundation.ts")).toMatch(
      /commissionDoesNotEnablePayoutExecution/
    );
  });
});
