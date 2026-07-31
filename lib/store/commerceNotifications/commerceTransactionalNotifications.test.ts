import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EXTERNAL_CHANNEL_CONTRACT,
  assertExternalChannelsDisabled,
  assertSameStoreScope,
  buildAdminNotificationDiagnostics,
  buildBuyerNotificationReadModel,
  buildCommerceDeepLink,
  buildEventIdempotencyKey,
  buildSellerNotificationReadModel,
  commerceEventToNotificationType,
  commerceNotificationTemplateRegistry,
  emitCommerceNotificationEvent,
  hasCommerceNotificationPermission,
  isAllowedCommerceDeepLink,
  redactCommerceMetadata,
  resetCommerceNotificationFoundation,
  resolveCommerceNotificationRecipients,
  sanitizeCommerceDeepLink,
  wireCommerceFulfillmentUpdate,
  wireCommerceInventorySignal,
  wireCommerceModeration,
  wireCommercePaymentOutcome,
  wireCommerceRefundCompleted,
} from "./index";

const ROOT = join(__dirname, "../../..");
const BUYER = "11111111-1111-4111-8111-111111111111";
const SELLER = "22222222-2222-4222-8222-222222222222";
const SUPPLIER = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const STORE = "55555555-5555-4555-8555-555555555555";
const PAY = "66666666-6666-4666-8666-666666666666";

afterEach(() => {
  resetCommerceNotificationFoundation();
});

describe("Commerce Transactional Notifications V1", () => {
  it("creates and validates events", () => {
    const result = emitCommerceNotificationEvent({
      eventType: "order_created",
      orderId: ORDER,
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
      idempotencyKey: "evt-order-1",
      metadata: { source: "test", sk_live_secret: "should-drop" },
    });
    expect(result.replayed).toBe(false);
    expect(result.event.eventType).toBe("order_created");
    expect(result.event.metadata.source).toBe("test");
    expect(result.event.metadata.sk_live_secret).toBeUndefined();
    expect(result.intents.length).toBeGreaterThanOrEqual(1);
  });

  it("resolves buyer and seller recipients", () => {
    const buyer = resolveCommerceNotificationRecipients({
      event: {
        eventType: "payment_failed",
        orderId: ORDER,
        storeId: STORE,
        buyerId: BUYER,
        sellerId: SELLER,
        supplierId: null,
      },
    });
    expect(buyer.ok).toBe(true);
    if (!buyer.ok) return;
    expect(buyer.recipients.map((r) => r.role)).toEqual(["buyer"]);

    const captured = resolveCommerceNotificationRecipients({
      event: {
        eventType: "payment_captured",
        orderId: ORDER,
        storeId: STORE,
        buyerId: BUYER,
        sellerId: SELLER,
        supplierId: null,
      },
    });
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    expect(captured.recipients.map((r) => r.recipientId).sort()).toEqual(
      [BUYER, SELLER].sort()
    );
  });

  it("resolves supplier when provenance marks supplier-owned listing", () => {
    const resolved = resolveCommerceNotificationRecipients({
      event: {
        eventType: "order_created",
        orderId: ORDER,
        storeId: STORE,
        buyerId: BUYER,
        sellerId: SELLER,
        supplierId: SUPPLIER,
      },
      supplierOwnedListing: true,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.recipients.some((r) => r.role === "supplier")).toBe(true);
  });

  it("enforces cross-store isolation helper and duplicate recipient removal", () => {
    expect(assertSameStoreScope(STORE, STORE)).toBe(true);
    expect(assertSameStoreScope(STORE, "other")).toBe(false);
    const resolved = resolveCommerceNotificationRecipients({
      event: {
        eventType: "payment_captured",
        orderId: ORDER,
        storeId: STORE,
        buyerId: BUYER,
        sellerId: BUYER,
        supplierId: null,
      },
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.recipients).toHaveLength(1);
  });

  it("selects templates with locale fallback", () => {
    const tpl = commerceNotificationTemplateRegistry.select(
      "order_shipped",
      "buyer",
      "fr"
    );
    expect(tpl).toBeTruthy();
    expect(
      commerceNotificationTemplateRegistry.resolveLocale(tpl!, "fr")
    ).toBe("en");
    expect(tpl!.titleKey).toMatch(/commerce\.notifications/);
  });

  it("builds and sanitizes deep links", () => {
    const href = buildCommerceDeepLink({
      role: "buyer",
      event: {
        eventType: "payment_captured",
        orderId: ORDER,
        storeId: STORE,
        buyerId: BUYER,
      },
    });
    expect(href).toBe(`/store/orders/${ORDER}`);
    expect(isAllowedCommerceDeepLink(href)).toBe(true);
    expect(sanitizeCommerceDeepLink("https://evil.example")).toBeNull();
    expect(sanitizeCommerceDeepLink("//evil")).toBeNull();
  });

  it("is idempotent at event and intent level (webhook retry)", () => {
    const key = buildEventIdempotencyKey({
      eventType: "payment_captured",
      orderId: ORDER,
      paymentId: PAY,
      storeId: STORE,
      correlationId: "corr-1",
    });
    const first = emitCommerceNotificationEvent({
      eventType: "payment_captured",
      orderId: ORDER,
      paymentId: PAY,
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
      correlationId: "corr-1",
      idempotencyKey: key,
    });
    const second = emitCommerceNotificationEvent({
      eventType: "payment_captured",
      orderId: ORDER,
      paymentId: PAY,
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
      correlationId: "corr-1",
      idempotencyKey: key,
    });
    expect(second.replayed).toBe(true);
    expect(second.event.eventId).toBe(first.event.eventId);
    expect(second.intents).toHaveLength(first.intents.length);
  });

  it("wires payment captured / failed and digital access", () => {
    wireCommercePaymentOutcome({
      outcome: "captured",
      paymentAttemptId: PAY,
      correlationId: "c1",
      entitlementGranted: true,
      payload: {
        order_id: ORDER,
        buyer_id: BUYER,
        store_id: STORE,
        seller_id: SELLER,
      },
    });
    wireCommercePaymentOutcome({
      outcome: "failed",
      paymentAttemptId: `${PAY}f`,
      correlationId: "c2",
      payload: {
        order_id: ORDER,
        buyer_id: BUYER,
        store_id: STORE,
      },
    });
    const diag = buildAdminNotificationDiagnostics(100);
    expect(diag.events.some((e) => e.eventType === "payment_captured")).toBe(
      true
    );
    expect(
      diag.events.some((e) => e.eventType === "digital_access_granted")
    ).toBe(true);
    expect(diag.events.some((e) => e.eventType === "payment_failed")).toBe(
      true
    );
  });

  it("wires fulfillment shipped/delivered, moderation, refund, inventory", () => {
    wireCommerceFulfillmentUpdate({
      orderId: ORDER,
      fulfillmentStatus: "shipped",
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
    });
    wireCommerceFulfillmentUpdate({
      orderId: ORDER,
      fulfillmentStatus: "delivered",
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
    });
    wireCommerceModeration({
      kind: "product_approved",
      productId: "77777777-7777-4777-8777-777777777777",
      sellerId: SELLER,
      storeId: STORE,
      platformAdminIds: [SELLER],
    });
    wireCommerceModeration({
      kind: "product_rejected",
      productId: "88888888-8888-4888-8888-888888888888",
      sellerId: SELLER,
      storeId: STORE,
    });
    wireCommerceModeration({
      kind: "seller_approved",
      sellerId: SELLER,
      storeId: STORE,
    });
    wireCommerceModeration({
      kind: "seller_rejected",
      sellerId: SELLER,
      storeId: STORE,
    });
    wireCommerceRefundCompleted({
      orderId: ORDER,
      storeId: STORE,
      paymentAttemptId: PAY,
      buyerId: BUYER,
      sellerId: SELLER,
    });
    wireCommerceInventorySignal({
      kind: "inventory_low",
      sellerId: SELLER,
      storeId: STORE,
      sku: "SKU-1",
    });
    wireCommerceInventorySignal({
      kind: "inventory_out",
      sellerId: SELLER,
      storeId: STORE,
      sku: "SKU-1",
    });
    const types = new Set(
      buildAdminNotificationDiagnostics(200).events.map((e) => e.eventType)
    );
    for (const t of [
      "order_shipped",
      "order_delivered",
      "product_approved",
      "product_rejected",
      "seller_approved",
      "seller_rejected",
      "refund_completed",
      "inventory_low",
      "inventory_out",
    ] as const) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("keeps external channels disabled and redacts secrets", () => {
    expect(EXTERNAL_CHANNEL_CONTRACT.email.enabled).toBe(false);
    expect(EXTERNAL_CHANNEL_CONTRACT.sms.enabled).toBe(false);
    expect(EXTERNAL_CHANNEL_CONTRACT.push.enabled).toBe(false);
    expect(() => assertExternalChannelsDisabled("email")).toThrow(/disabled/i);
    const meta = redactCommerceMetadata({
      orderId: ORDER,
      token: "x",
      stripe_secret: "sk_test_x",
      ok: true,
    });
    expect(meta.ok).toBe(true);
    expect(meta.token).toBeUndefined();
    expect(meta.stripe_secret).toBeUndefined();
  });

  it("enforces permission checks and read models", () => {
    emitCommerceNotificationEvent({
      eventType: "order_created",
      orderId: ORDER,
      buyerId: BUYER,
      sellerId: SELLER,
      storeId: STORE,
      idempotencyKey: "rm-1",
    });
    expect(
      hasCommerceNotificationPermission(
        { userId: BUYER, isPlatformAdmin: false, storeIdsManaged: [] },
        "notification_create"
      )
    ).toBe(false);
    expect(
      hasCommerceNotificationPermission(
        { userId: BUYER, isPlatformAdmin: false, storeIdsManaged: [] },
        "notification_read_self",
        { recipientId: BUYER }
      )
    ).toBe(true);
    expect(
      hasCommerceNotificationPermission(
        { userId: SELLER, isPlatformAdmin: false, storeIdsManaged: [STORE] },
        "notification_read_store",
        { storeId: STORE }
      )
    ).toBe(true);
    expect(
      hasCommerceNotificationPermission(
        { userId: BUYER, isPlatformAdmin: true, storeIdsManaged: [] },
        "notification_read_admin"
      )
    ).toBe(true);

    const buyerRm = buildBuyerNotificationReadModel(BUYER);
    const sellerRm = buildSellerNotificationReadModel(SELLER);
    expect(buyerRm.recent.length).toBeGreaterThan(0);
    expect(sellerRm.recent.length).toBeGreaterThan(0);
    expect(buildAdminNotificationDiagnostics().templates.length).toBeGreaterThan(
      10
    );
  });

  it("architecture guard: no providers / client emit / maps types", () => {
    expect(commerceEventToNotificationType("payment_captured")).toBe(
      "commerce_payment_captured"
    );
    const service = readFileSync(
      join(ROOT, "lib/store/commerceNotifications/service.ts"),
      "utf8"
    );
    expect(service).not.toMatch(/nodemailer|twilio|sendgrid|firebase|fetch\(/i);
    expect(service).toMatch(/in_app_only_v1/);

    const wire = readFileSync(
      join(ROOT, "lib/store/commerceNotifications/wire.ts"),
      "utf8"
    );
    expect(wire).not.toMatch(/"use client"/);

    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260887_store_commerce_transactional_notifications_v1.sql"
        )
      )
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/admin/store/notifications/page.tsx"))
    ).toBe(true);

    const migration = readFileSync(
      join(
        ROOT,
        "supabase/migrations/20260887_store_commerce_transactional_notifications_v1.sql"
      ),
      "utf8"
    );
    expect(migration).toMatch(/create_store_commerce_notification/);
    expect(migration).toMatch(/commerce_payment_captured/);
    expect(migration).toMatch(/grant execute[\s\S]*service_role/i);
    expect(migration).not.toMatch(/grant execute[\s\S]*authenticated/i);
  });

  it("fails closed when required buyer missing", () => {
    const resolved = resolveCommerceNotificationRecipients({
      event: {
        eventType: "payment_failed",
        orderId: ORDER,
        storeId: STORE,
        buyerId: null,
        sellerId: SELLER,
        supplierId: null,
      },
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe("missing_buyer");
  });
});
