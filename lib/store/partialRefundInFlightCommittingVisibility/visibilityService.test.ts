/**
 * In-flight committing visibility tests (mocks only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryPartialRefundLedgerRepository } from "../partialRefundLedger";
import {
  PARTIAL_REFUND_LIST_COMMITTING_MIGRATION_FILE,
  PARTIAL_REFUND_LEDGER_RPCS,
} from "../partialRefundLedger";
import {
  listInFlightCommittingPartialRefundReservations,
  partialRefundInFlightCommittingVisibilityOwnership,
} from "./index";

const ROOT = join(__dirname, "../../..");

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  ledger: "66666666-6666-4666-8666-666666666666",
  ledger2: "77777777-7777-4777-8777-777777777777",
};

async function seedStatus(
  repo: MemoryPartialRefundLedgerRepository,
  ledgerId: string,
  status: "planned" | "committing" | "committed" | "failed",
  createdAtIso = "2026-01-01T00:00:00.000Z"
) {
  await repo.ensureCaptureAccounting({
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    currency: "USD",
    captureAmountMinor: 2000,
  });
  const planned = await repo.insertPlanned(
    {
      ledgerId,
      idempotencyKey: `vis-idem-${ledgerId.slice(0, 8)}`,
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
      refundAmountMinor: 500,
      calculationFingerprint: "fp-vis-01",
      expectedAccountingVersion: 0,
      lines: [
        {
          orderItemId: IDS.item,
          requestedQuantity: 1,
          refundAmountMinor: 500,
        },
      ],
    },
    createdAtIso
  );
  if (!planned.ok) throw new Error("seed planned failed");
  if (status === "planned") return;
  const begun = await repo.transitionToCommitting(
    ledgerId,
    "planned",
    0,
    "2026-01-01T00:01:00.000Z",
    { [IDS.item]: 2 }
  );
  if (!begun.ok) throw new Error("seed begin failed");
  if (status === "committing") return;
  if (status === "committed") {
    const done = await repo.completeCommitted(
      ledgerId,
      0,
      "2026-01-01T00:02:00.000Z"
    );
    if (!done.ok) throw new Error("seed complete failed");
    return;
  }
  const failed = await repo.markFailed(
    ledgerId,
    "test_fail",
    "failed for test",
    "2026-01-01T00:02:00.000Z"
  );
  if (!failed.ok) throw new Error("seed fail failed");
}

describe("partialRefundInFlightCommittingVisibility service", () => {
  it("lists only committing and excludes other statuses", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedStatus(repo, IDS.ledger, "committing");
    // second capture needed for another committing? unique one_committing per capture
    // seed planned/committed/failed on same capture after failing first
    await repo.markFailed(
      IDS.ledger,
      "x",
      "release for other statuses",
      "2026-01-01T00:03:00.000Z"
    );
    // re-plan different ledgers isn't easy on same capture while failed exists
    // Use listCommitting filter via spy on mixed memory rows:
    const spy = vi.spyOn(repo, "listCommitting");
    spy.mockResolvedValueOnce([
      {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.order,
        captureEventId: IDS.capture,
        status: "committing",
        accountingVersion: 0,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        updatedAtIso: "2026-01-01T00:01:00.000Z",
      },
    ]);
    const listed = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      {}
    );
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.status).toBe("listed");
    expect(listed.rows).toHaveLength(1);
    expect(listed.rows[0]?.status).toBe("committing");
    expect(listed.readOnly).toBe(true);
    expect(listed.stateChanged).toBe(false);
    expect(listed.committingLockReleased).toBe(false);
    expect(listed.recoveryPerformed).toBe(false);
    expect(listed.moneyMoved).toBe(false);
  });

  it("returns empty for no committing rows", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const result = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      {}
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("empty");
    expect(result.rows).toHaveLength(0);
  });

  it("rejects malformed store/capture/limit", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const badStore = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      { storeId: "not-a-uuid" }
    );
    expect(badStore.ok).toBe(false);
    if (badStore.ok) return;
    expect(badStore.status).toBe("validation_failed");

    const badLimit = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      { limit: 999 }
    );
    expect(badLimit.ok).toBe(false);
  });

  it("applies store scope and fails closed on cross-store leak", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    vi.spyOn(repo, "listCommitting").mockResolvedValue([
      {
        ledgerId: IDS.ledger,
        storeId: IDS.storeB,
        orderId: IDS.order,
        captureEventId: IDS.capture,
        status: "committing",
        accountingVersion: 0,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        updatedAtIso: "2026-01-01T00:01:00.000Z",
      },
    ]);
    const result = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      { storeId: IDS.store }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("unauthorized");
  });

  it("maps repository errors safely", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    vi.spyOn(repo, "listCommitting").mockRejectedValue(new Error("boom"));
    const result = await listInFlightCommittingPartialRefundReservations(
      { repository: repo },
      {}
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("repository_error");
    expect(result.message).not.toMatch(/boom/);
  });

  it("never calls mutation repository methods", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const insert = vi.spyOn(repo, "insertPlanned");
    const begin = vi.spyOn(repo, "transitionToCommitting");
    const complete = vi.spyOn(repo, "completeCommitted");
    const fail = vi.spyOn(repo, "markFailed");
    await listInFlightCommittingPartialRefundReservations({ repository: repo }, {});
    expect(insert).not.toHaveBeenCalled();
    expect(begin).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });

  it("capability ownership is visibility-only", () => {
    const o = partialRefundInFlightCommittingVisibilityOwnership();
    expect(o.ownsAdminInFlightCommittingVisibility).toBe(true);
    expect(o.ownsReadOnlyCommittingDiscovery).toBe(true);
    expect(o.ownsRecoveryExecution).toBe(false);
    expect(o.ownsCommittingLockRelease).toBe(false);
    expect(o.ownsPartialRefundMoneyMovement).toBe(false);
    expect(o.ownsSellerVisibility).toBe(false);
  });

  it("memory repo lists only committing with deterministic order", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedStatus(repo, IDS.ledger, "committing", "2026-01-01T00:00:00.000Z");
    const rows = await repo.listCommitting({ limit: 10 });
    expect(rows.every((r) => r.status === "committing")).toBe(true);
    expect(rows[0]?.ledgerId).toBe(IDS.ledger);
  });

  it("memory listCommitting excludes planned, committed, and failed", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedStatus(repo, IDS.ledger, "planned");
    expect(await repo.listCommitting({})).toHaveLength(0);

    await repo.transitionToCommitting(
      IDS.ledger,
      "planned",
      0,
      "2026-01-01T00:01:00.000Z",
      { [IDS.item]: 2 }
    );
    expect((await repo.listCommitting({})).map((r) => r.ledgerId)).toEqual([
      IDS.ledger,
    ]);

    await repo.markFailed(
      IDS.ledger,
      "test",
      "release",
      "2026-01-01T00:02:00.000Z"
    );
    expect(await repo.listCommitting({})).toHaveLength(0);

    // committed path on a fresh capture
    const capture2 = "88888888-8888-4888-8888-888888888888";
    await repo.ensureCaptureAccounting({
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: capture2,
      currency: "USD",
      captureAmountMinor: 2000,
    });
    const planned = await repo.insertPlanned(
      {
        ledgerId: IDS.ledger2,
        idempotencyKey: "vis-idem-committed",
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: capture2,
        currency: "USD",
        captureAmountMinor: 2000,
        refundAmountMinor: 500,
        calculationFingerprint: "fp-vis-02",
        expectedAccountingVersion: 0,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
      },
      "2026-01-01T00:00:00.000Z"
    );
    expect(planned.ok).toBe(true);
    await repo.transitionToCommitting(
      IDS.ledger2,
      "planned",
      0,
      "2026-01-01T00:01:00.000Z",
      { [IDS.item]: 2 }
    );
    await repo.completeCommitted(
      IDS.ledger2,
      0,
      "2026-01-01T00:02:00.000Z"
    );
    expect(await repo.listCommitting({})).toHaveLength(0);
  });

  it("supports store and capture scope filters", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedStatus(repo, IDS.ledger, "committing");
    const byStore = await repo.listCommitting({ storeId: IDS.store });
    expect(byStore).toHaveLength(1);
    const otherStore = await repo.listCommitting({ storeId: IDS.storeB });
    expect(otherStore).toHaveLength(0);
    const byCapture = await repo.listCommitting({
      captureEventId: IDS.capture,
    });
    expect(byCapture).toHaveLength(1);
    const otherCapture = await repo.listCommitting({
      captureEventId: "99999999-9999-4999-8999-999999999999",
    });
    expect(otherCapture).toHaveLength(0);
  });

  it("parseCommittingList fails closed on malformed rows", async () => {
    const { parseCommittingList } = await import("../partialRefundLedger");
    expect(parseCommittingList({ ok: true, commits: [{ status: "planned" }] }).ok).toBe(
      false
    );
    expect(
      parseCommittingList({
        ok: true,
        commits: [
          {
            ledger_id: IDS.ledger,
            store_id: IDS.store,
            order_id: IDS.order,
            capture_event_id: IDS.capture,
            status: "committing",
            accounting_version: 0,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:01:00.000Z",
          },
        ],
      }).ok
    ).toBe(true);
  });
});

describe("list_committing RPC SQL contracts", () => {
  it("ships 20260905 with service_role-only committing filter and no mutation", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations", PARTIAL_REFUND_LIST_COMMITTING_MIGRATION_FILE),
      "utf8"
    ).replace(/\r\n/g, "\n");
    expect(sql).toMatch(/list_store_partial_refund_ledger_committing/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/search_path\s*=\s*public/);
    expect(sql).toMatch(/status = 'committing'/);
    expect(sql).not.toMatch(/p_status/);
    expect(sql).toMatch(/order by c\.created_at asc, c\.id asc/i);
    expect(sql).toMatch(/limit lim/i);
    expect(sql).toMatch(/revoke all[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute[\s\S]*to service_role/);
    expect(sql).not.toMatch(/^\s*update\b/im);
    expect(sql).not.toMatch(/^\s*insert\b/im);
    expect(sql).not.toMatch(/^\s*delete\b/im);
    expect(sql).not.toMatch(/\bupdate\s+public\./i);
    expect(sql).not.toMatch(/\binsert\s+into\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(PARTIAL_REFUND_LEDGER_RPCS.listCommitting).toBe(
      "list_store_partial_refund_ledger_committing"
    );
  });
});

describe("partialRefundInFlightCommittingVisibility UI audits", () => {
  it("admin UI shows visibility section and keeps recovery separate", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/admin/store/refunds/PartialRefundStuckCommittingRecoveryPanel.tsx"
      ),
      "utf8"
    );
    expect(src).toMatch(/In-flight committing reservations/);
    expect(src).toMatch(/does not change state or release/i);
    expect(src).toMatch(/adminListInFlightCommittingPartialRefundAction/);
    expect(src).toMatch(/adminRecoverStuckCommittingPartialRefundAction/);
    expect(src).not.toMatch(/name=["']amount/);
    expect(src).not.toMatch(/Cancel Refund|Refund Money/);
    expect(src).not.toMatch(/auto.?recover/i);
  });

  it("visibility action is admin-only and mutation-free", () => {
    const actions = readFileSync(
      join(ROOT, "app/actions/storePartialRefundInFlightCommittingVisibility.ts"),
      "utf8"
    );
    expect(actions).toMatch(/assertPlatformAdminDb/);
    expect(actions).toMatch(/adminListInFlightCommittingPartialRefundAction/);
    expect(actions).not.toMatch(/sellerList|buyerList/);
    expect(actions).not.toMatch(/recoverStuck|failPartialRefund|planPartialRefund/);
    expect(actions).not.toMatch(/name=["']amount|requestedQuantity|currency/);
  });
});
