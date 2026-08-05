/**
 * Seller Live Payout Provider V1 — Slice S3 destination helper tests.
 */

import { describe, expect, it, vi } from "vitest";
import {
  SELLER_LIVE_PAYOUT_DESTINATION_RPCS,
  assertNoSensitiveDestinationFields,
  listMyStorePayoutDestinations,
  parseSellerLivePayoutDestination,
  rejectUnsafeDestinationClientFields,
  upsertMyStorePayoutDestination,
  validateMaskedDestinationDisplayLabel,
} from "./destinations";

const STORE_ID = "11111111-1111-4111-8111-111111111111";

function mockClient(rpcImpl: (fn: string, args: unknown) => Promise<unknown>) {
  return {
    rpc: vi.fn(async (fn: string, args: unknown) => {
      try {
        const data = await rpcImpl(fn, args);
        return { data, error: null };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    }),
  } as never;
}

describe("Seller Live Payout destinations (S3)", () => {
  it("exposes only S2 destination RPC names", () => {
    expect(SELLER_LIVE_PAYOUT_DESTINATION_RPCS.upsert).toBe(
      "upsert_my_store_payout_destination"
    );
    expect(SELLER_LIVE_PAYOUT_DESTINATION_RPCS.list).toBe(
      "list_my_store_payout_destinations"
    );
  });

  it("accepts masked labels and rejects account-number-like values", () => {
    expect(validateMaskedDestinationDisplayLabel("Ops clearing •••• 42").ok).toBe(
      true
    );
    expect(
      validateMaskedDestinationDisplayLabel("Bank ****1234").ok
    ).toBe(true);
    expect(
      validateMaskedDestinationDisplayLabel("12345678").ok
    ).toBe(false);
    expect(
      validateMaskedDestinationDisplayLabel("Account 123456789012").ok
    ).toBe(false);
    expect(validateMaskedDestinationDisplayLabel("ab").ok).toBe(false);
  });

  it("rejects unsafe client secret / account fields", () => {
    expect(
      rejectUnsafeDestinationClientFields({ account_number: "12345678" }).ok
    ).toBe(false);
    expect(
      rejectUnsafeDestinationClientFields({ iban: "DE00" }).ok
    ).toBe(false);
    expect(
      rejectUnsafeDestinationClientFields({
        storeId: STORE_ID,
        displayLabel: "Ops •••• 42",
      }).ok
    ).toBe(true);
  });

  it("parses masked destinations and drops sensitive payloads", () => {
    const parsed = parseSellerLivePayoutDestination({
      id: "55555555-5555-4555-8555-555555555555",
      store_id: STORE_ID,
      provider_id: "manual_ops_live",
      currency: "usd",
      display_label: "Ops clearing •••• 42",
      verification_state: "unverified",
      is_active: true,
      created_at: "2026-08-05T00:00:00Z",
      updated_at: "2026-08-05T00:00:00Z",
    });
    expect(parsed?.displayLabel).toBe("Ops clearing •••• 42");
    expect(parsed?.providerId).toBe("manual_ops_live");

    expect(
      parseSellerLivePayoutDestination({
        id: "55555555-5555-4555-8555-555555555555",
        store_id: STORE_ID,
        provider_id: "manual_ops_live",
        currency: "USD",
        display_label: "12345678901234",
        verification_state: "unverified",
        is_active: true,
        created_at: "2026-08-05T00:00:00Z",
        updated_at: "2026-08-05T00:00:00Z",
      })
    ).toBeNull();

    expect(
      assertNoSensitiveDestinationFields({ account_number: "x" })
    ).toBe(false);
  });

  it("upserts via S2 RPC with masked label only", async () => {
    const client = mockClient(async (fn, args) => {
      expect(fn).toBe("upsert_my_store_payout_destination");
      const a = args as Record<string, unknown>;
      expect(a.p_display_label).toBe("Ops clearing •••• 42");
      expect(a.p_provider_id).toBe("manual_ops_live");
      expect(a).not.toHaveProperty("p_account_number");
      return {
        ok: true,
        destination: {
          id: "55555555-5555-4555-8555-555555555555",
          store_id: STORE_ID,
          provider_id: "manual_ops_live",
          currency: "USD",
          display_label: "Ops clearing •••• 42",
          verification_state: "pending_review",
          is_active: true,
          created_at: "2026-08-05T00:00:00Z",
          updated_at: "2026-08-05T00:00:00Z",
        },
      };
    });

    const res = await upsertMyStorePayoutDestination(client, {
      storeId: STORE_ID,
      currency: "usd",
      displayLabel: "Ops clearing •••• 42",
      requestReview: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.destination.verificationState).toBe("pending_review");
  });

  it("rejects upsert of Connect provider and unsafe labels before RPC", async () => {
    const rpc = vi.fn();
    const client = { rpc } as never;
    const connect = await upsertMyStorePayoutDestination(client, {
      storeId: STORE_ID,
      providerId: "stripe_connect",
      currency: "USD",
      displayLabel: "Ops clearing •••• 42",
    });
    expect(connect.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();

    const unsafe = await upsertMyStorePayoutDestination(client, {
      storeId: STORE_ID,
      currency: "USD",
      displayLabel: "123456789012",
    });
    expect(unsafe.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lists destinations via S2 RPC only", async () => {
    const client = mockClient(async (fn) => {
      expect(fn).toBe("list_my_store_payout_destinations");
      return {
        ok: true,
        destinations: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            store_id: STORE_ID,
            provider_id: "manual_ops_live",
            currency: "USD",
            display_label: "Ops clearing •••• 42",
            verification_state: "verified",
            is_active: true,
            created_at: "2026-08-05T00:00:00Z",
            updated_at: "2026-08-05T00:00:00Z",
          },
        ],
      };
    });
    const res = await listMyStorePayoutDestinations(client, STORE_ID);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.destinations).toHaveLength(1);
    expect(res.destinations[0].displayLabel).not.toMatch(/[0-9]{8,}/);
  });
});
