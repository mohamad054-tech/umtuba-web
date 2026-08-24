import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMMISSION_POLICY_ARCHITECTURE,
  DEFAULT_SELLER_PAYOUT_STATE,
  PAYMENT_PROVIDER_CONNECTED,
  REAL_PAYMENT_CAPTURE,
  REAL_SELLER_PAYOUT,
  REQUIRED_ORDER_STATES,
  REQUIRED_ORDER_STATE_TO_DB,
  SELLER_LIFECYCLE_STATES,
  SELLER_LIFECYCLE_TO_DB,
  assertCommerceFinancialGates,
  canExecuteRealPaymentCapture,
  canExecuteRealRefund,
  canExecuteRealSellerPayout,
  currentCommissionRateBps,
  deriveSellerPayoutState,
  redactBuyerPrivateFields,
  rejectHardcodedCommissionPercent,
  sellerLifecycleAllowsCatalog,
  toRequiredOrderState,
  toSellerLifecycleState,
} from "./commerceReadiness";
import {
  assertRefundExecutionBlocked,
  canBuyerRequestReturn,
  canSellerConfirmReturned,
  nextStatusAfterBuyerReturnRequest,
  nextStatusAfterSellerReturnConfirm,
  validateReturnReason,
} from "./orderReturns";
import {
  canBuyerWriteReview,
  publicReviewAverage,
  validateReviewBody,
  validateReviewRating,
} from "./productReviews";
import { ORDER_STATUSES } from "./types";
import { ORDER_STATUS_TRANSITIONS, canSellerTransitionOrderStatus } from "./orderRules";
import { createDraftProduct } from "./sellerStore";
import { applyToBecomeSeller } from "./sellerApplications";

const ROOT = process.cwd();
const FORBIDDEN_STORE_20260934 =
  "supabase/migrations/20260934_store_seller_center_commerce_readiness_v1.sql";
const SELLER_RLS =
  "supabase/migrations/20260810_store_seller_self_service_v1.sql";
const PRODUCT_FOUNDATION =
  "supabase/migrations/20260728_store_product_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("commerce financial gates", () => {
  it("keeps capture, payout, and provider connect disabled", () => {
    expect(REAL_PAYMENT_CAPTURE).toBe("DISABLED");
    expect(REAL_SELLER_PAYOUT).toBe("DISABLED");
    expect(PAYMENT_PROVIDER_CONNECTED).toBe("NO");
    expect(assertCommerceFinancialGates()).toEqual({
      ok: true,
      REAL_PAYMENT_CAPTURE: "DISABLED",
      REAL_SELLER_PAYOUT: "DISABLED",
      PAYMENT_PROVIDER_CONNECTED: "NO",
    });
    expect(canExecuteRealPaymentCapture()).toBe(false);
    expect(canExecuteRealSellerPayout()).toBe(false);
    expect(canExecuteRealRefund()).toBe(false);
  });

  it("refuses a hardcoded final commission percentage", () => {
    expect(COMMISSION_POLICY_ARCHITECTURE.rateBps).toBeNull();
    expect(currentCommissionRateBps()).toBeNull();
    expect(rejectHardcodedCommissionPercent(15).ok).toBe(false);
    expect(rejectHardcodedCommissionPercent("12.5").ok).toBe(false);
    expect(rejectHardcodedCommissionPercent(null).ok).toBe(true);
  });

  it("holds payout state at NOT_ELIGIBLE", () => {
    expect(deriveSellerPayoutState()).toBe(DEFAULT_SELLER_PAYOUT_STATE);
    expect(DEFAULT_SELLER_PAYOUT_STATE).toBe("NOT_ELIGIBLE");
  });
});

describe("seller lifecycle mapping", () => {
  it("maps persisted lowercase statuses to the required lifecycle", () => {
    expect(toSellerLifecycleState("draft")).toBe("DRAFT");
    expect(toSellerLifecycleState("pending")).toBe("PENDING_REVIEW");
    expect(toSellerLifecycleState("approved")).toBe("APPROVED");
    expect(toSellerLifecycleState("suspended")).toBe("SUSPENDED");
    expect(toSellerLifecycleState("rejected")).toBe("REJECTED");
    expect(SELLER_LIFECYCLE_STATES).toEqual([
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "SUSPENDED",
      "REJECTED",
    ]);
    expect(SELLER_LIFECYCLE_TO_DB.PENDING_REVIEW).toBe("pending");
    expect(sellerLifecycleAllowsCatalog("DRAFT")).toBe(false);
    expect(sellerLifecycleAllowsCatalog("APPROVED")).toBe(true);
  });

  it("does not fake seller approval on the legacy apply path", async () => {
    const result = await applyToBecomeSeller({} as never, "user-1", {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/wizard|seller\/setup/i);
  });
});

describe("required order states", () => {
  it("covers every required Central order state plus packed compatibility", () => {
    for (const state of REQUIRED_ORDER_STATES) {
      expect(ORDER_STATUSES).toContain(REQUIRED_ORDER_STATE_TO_DB[state]);
    }
    expect(ORDER_STATUSES).toContain("packed");
    expect(toRequiredOrderState("return_requested")).toBe("RETURN_REQUESTED");
    expect(ORDER_STATUS_TRANSITIONS.delivered).toContain("return_requested");
    expect(ORDER_STATUS_TRANSITIONS.return_requested).toContain("returned");
    expect(canSellerTransitionOrderStatus("delivered", "refunded")).toBe(false);
    expect(canSellerTransitionOrderStatus("return_requested", "returned")).toBe(
      true
    );
  });
});

describe("returns workflow", () => {
  it("lets only the buyer request a return after delivery", () => {
    expect(
      canBuyerRequestReturn({
        buyerId: "b1",
        orderBuyerId: "b1",
        status: "delivered",
      }).ok
    ).toBe(true);
    expect(
      canBuyerRequestReturn({
        buyerId: "b1",
        orderBuyerId: "other",
        status: "delivered",
      }).ok
    ).toBe(false);
    expect(
      canBuyerRequestReturn({
        buyerId: "b1",
        orderBuyerId: "b1",
        status: "shipped",
      }).ok
    ).toBe(false);
    expect(nextStatusAfterBuyerReturnRequest("delivered")).toBe(
      "return_requested"
    );
    expect(nextStatusAfterSellerReturnConfirm("return_requested")).toBe(
      "returned"
    );
    expect(
      canSellerConfirmReturned({ status: "return_requested", role: "owner" }).ok
    ).toBe(true);
    expect(
      canSellerConfirmReturned({ status: "delivered", role: "owner" }).ok
    ).toBe(false);
    expect(validateReturnReason("too").ok).toBe(false);
    expect(assertRefundExecutionBlocked().ok).toBe(false);
  });
});

describe("reviews", () => {
  it("requires a delivered buyer purchase and never invents an average", () => {
    expect(validateReviewRating(5).ok).toBe(true);
    expect(validateReviewRating(0).ok).toBe(false);
    expect(validateReviewBody("short").ok).toBe(false);
    expect(
      canBuyerWriteReview({
        buyerId: "b1",
        orderBuyerId: "b1",
        orderStatus: "delivered",
        productId: "p1",
        orderProductIds: ["p1"],
      }).ok
    ).toBe(true);
    expect(
      canBuyerWriteReview({
        buyerId: "b1",
        orderBuyerId: "b1",
        orderStatus: "delivered",
        productId: "p1",
        orderProductIds: ["p1"],
        sellerUserId: "b1",
      }).ok
    ).toBe(false);
    expect(publicReviewAverage([])).toBeNull();
    expect(
      publicReviewAverage([
        { rating: 5, status: "published" },
        { rating: 3, status: "published" },
      ])
    ).toBe(4);
  });
});

describe("customer privacy", () => {
  it("strips buyer private contact fields from seller-facing objects", () => {
    const redacted = redactBuyerPrivateFields({
      order_id: "o1",
      email: "buyer@example.com",
      phone: "+15551212",
      full_name: "Buyer Name",
      address_line1: "1 Hidden St",
      address_line2: "Apt 2",
      city: "Austin",
    });
    expect(redacted).toEqual({ order_id: "o1", city: "Austin" });
    expect(JSON.stringify(redacted)).not.toMatch(/buyer@example.com|Hidden St/);
  });
});

function makeSellerClient(input: {
  verification: string;
  inserts: Array<Record<string, unknown>>;
}) {
  return {
    from(table: string) {
      const query: {
        payload: Record<string, unknown> | null;
        select: () => typeof query;
        eq: () => typeof query;
        insert: (payload: Record<string, unknown>) => typeof query;
        upsert: () => typeof query;
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
        single: () => Promise<{
          data: Record<string, unknown> | null;
          error: null;
        }>;
      } = {
        payload: null,
        select() {
          return query;
        },
        eq() {
          return query;
        },
        insert(payload: Record<string, unknown>) {
          input.inserts.push({ table, ...payload });
          query.payload = payload;
          return query;
        },
        upsert() {
          return query;
        },
        async maybeSingle() {
          if (table === "store_members") {
            return { data: { role: "owner", status: "active" } };
          }
          if (table === "stores") {
            return { data: { verification_status: input.verification } };
          }
          return { data: null };
        },
        async single() {
          if (table === "store_products") {
            return {
              data: {
                id: "prod-1",
                store_id: query.payload?.store_id,
                slug: query.payload?.slug,
                title: query.payload?.title,
                status: "draft",
              },
              error: null,
            };
          }
          if (table === "product_variants") {
            return { data: { id: "var-1" }, error: null };
          }
          return { data: null, error: null };
        },
      };
      return query;
    },
  };
}

describe("product persistence contract", () => {
  it("persists a draft through store_products insert when membership is verified", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const result = await createDraftProduct(
      makeSellerClient({ verification: "verified", inserts }) as never,
      "seller-1",
      "store-1",
      {
        title: "Cedar Mug",
        slug: "cedar-mug",
        shortDescription: "Handmade mug",
        description: "A durable handmade mug for everyday use.",
        productType: "physical",
        amountMinor: 1999,
        currency: "USD",
        onHand: 12,
      }
    );
    expect(result.ok).toBe(true);
    const product = inserts.find((row) => row.table === "store_products");
    expect(product?.store_id).toBe("store-1");
    expect(product?.title).toBe("Cedar Mug");
    expect(product?.slug).toBe("cedar-mug");
    expect(product?.status).toBe("draft");
    expect(inserts.some((row) => row.table === "product_variants")).toBe(true);
    expect(inserts.some((row) => row.table === "product_inventory")).toBe(true);
  });

  it("refuses product create when the store is not verified", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const result = await createDraftProduct(
      makeSellerClient({ verification: "pending", inserts }) as never,
      "seller-1",
      "store-1",
      { title: "Blocked", slug: "blocked" }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/verified/i);
    expect(inserts).toHaveLength(0);
  });
});

describe("seller isolation / RLS contracts", () => {
  it("keeps seller application writes draft-only and submit RPC owned", () => {
    const sql = read(SELLER_RLS);
    expect(sql).toMatch(/status = 'draft'/);
    expect(sql).toMatch(/submit_my_seller_application/);
    expect(sql).toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(/Users insert own draft seller applications/);
    expect(sql).toMatch(/Users update own draft seller applications/);
  });

  it("keeps store products seller-owned in the product foundation", () => {
    const sql = read(PRODUCT_FOUNDATION);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/store_members|owner_user_id|auth\.uid\(\)/);
  });

  it("does not ship Store 20260934 SQL and keeps capture/payout fail-closed in source", () => {
    expect(existsSync(join(ROOT, FORBIDDEN_STORE_20260934))).toBe(false);
    const migrationNames = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrationNames.some((name) =>
        name.startsWith("20260934_store_seller_center")
      )
    ).toBe(false);
    expect(migrationNames.some((name) => name.startsWith("20260931"))).toBe(false);
    expect(migrationNames.some((name) => name.startsWith("20260929"))).toBe(false);

    const readiness = read("lib/store/commerceReadiness.ts");
    expect(readiness).toMatch(/REAL_PAYMENT_CAPTURE = "DISABLED"/);
    expect(readiness).toMatch(/REAL_SELLER_PAYOUT = "DISABLED"/);
    expect(readiness).toMatch(/PAYMENT_PROVIDER_CONNECTED = "NO"/);
    expect(readiness).not.toMatch(/create table if not exists public\.(stripe|paypal)/i);
    expect(readiness).not.toMatch(/rate_bps integer not null default/);
    expect(canExecuteRealPaymentCapture()).toBe(false);
    expect(canExecuteRealSellerPayout()).toBe(false);
    expect(canExecuteRealRefund()).toBe(false);
    expect(currentCommissionRateBps()).toBeNull();
    expect(assertRefundExecutionBlocked()).toEqual({
      ok: false,
      message:
        "Real refund execution is disabled. Return state may be recorded; money is not moved.",
    });
  });
});
