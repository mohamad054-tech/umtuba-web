import Link from "next/link";
import { redirect } from "next/navigation";
import FulfillmentAdminPanel from "../../../../components/store/FulfillmentAdminPanel";
import OrderDetailView from "../../../../components/store/OrderDetailView";
import SellerOpsShell from "../../../../components/store/SellerOpsShell";
import StoreErrorState from "../../../../components/store/StoreErrorState";
import { APP_ROUTES } from "../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  deriveSellerOrderAttention,
  isPaymentBlockingFulfillmentProgress,
  paymentBlockReason,
} from "../../../../../lib/store/sellerOrdersPresentation";
import { getSellerOrderDetail } from "../../../../../lib/store/orders";
import { canManageStoreSettings } from "../../../../../lib/store/permissions";
import {
  getOrderFulfillment,
  listOrderShipments,
} from "../../../../../lib/store/promotionsFulfillment";
import { getOwnedOrMemberStore } from "../../../../../lib/store/sellerStore";

export const metadata = {
  title: "Order detail | UMTUBA Seller",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function SellerStoreOrderDetailPage({
  params,
}: PageProps) {
  const user = await getServerUser();
  const { orderId } = await Promise.resolve(params);
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(
        `${APP_ROUTES.sellerOrders}/${orderId}`
      )}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  if (membership.store.status !== "active") {
    return (
      <SellerOpsShell title="Order" subtitle={membership.store.name}>
        <div className="mt-6">
          <StoreErrorState message="This store is not active. Order operations are unavailable." />
        </div>
      </SellerOpsShell>
    );
  }

  const result = await getSellerOrderDetail(
    supabase,
    membership.store.id,
    membership.role,
    orderId
  );

  const canManage = canManageStoreSettings(membership.role);
  const fulfillmentResult = result.ok
    ? await getOrderFulfillment(supabase, orderId)
    : null;
  const shipmentsResult = result.ok
    ? await listOrderShipments(supabase, orderId)
    : null;

  const attention = result.ok
    ? deriveSellerOrderAttention({
        status: result.data.order.status,
        paymentStatus: result.data.order.payment_status,
        fulfillmentStatus: result.data.order.fulfillment_status,
      })
    : null;
  const paymentBlocked = result.ok
    ? isPaymentBlockingFulfillmentProgress(result.data.order.payment_status)
    : false;

  return (
    <SellerOpsShell
      title={result.ok ? result.data.order.order_number : "Order"}
      subtitle={membership.store.name}
    >
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href={APP_ROUTES.sellerOrders}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          ← Back to orders
        </Link>
        <Link
          href={APP_ROUTES.sellerStore}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          Store dashboard
        </Link>
        <Link
          href={`${APP_ROUTES.sellerStore}/products`}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          Products
        </Link>
      </div>

      {!result.ok ? (
        <div className="mt-6 space-y-4">
          <StoreErrorState message={result.message} />
          <p className="text-sm text-[var(--sf-faint)]">
            Orders from other stores are not shown. Continue from{" "}
            <Link
              href={APP_ROUTES.sellerOrders}
              className="font-semibold text-[var(--sf-accent-strong)]"
            >
              seller orders
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {attention && attention.level !== "none" && attention.message ? (
            <p
              role="status"
              className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                attention.level === "critical"
                  ? "border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] text-[var(--sf-danger)]"
                  : attention.level === "warn"
                    ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                    : "border-[var(--sf-line)] bg-white/[0.03] text-[var(--sf-muted)]"
              }`}
            >
              {attention.message}
            </p>
          ) : null}

          <OrderDetailView bundle={result.data} mode="seller" />

          <div className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
            <h2 className="sf-display text-xl font-semibold tracking-tight">
              Fulfillment workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
              Lightweight fulfillment tools from existing store contracts. This
              is not Warehouse execution and not Shipping Network. Carrier and
              tracking fields remain deferred placeholders where present.
            </p>
            {paymentBlocked ? (
              <p
                role="status"
                className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              >
                {paymentBlockReason(result.data.order.payment_status)} Advanced
                shipment actions stay unavailable while payment is unpaid or
                failed.
              </p>
            ) : null}
            <div className="mt-4">
              <FulfillmentAdminPanel
                orderId={orderId}
                canManage={
                  canManage && result.data.canUpdate && !paymentBlocked
                }
                fulfillment={
                  fulfillmentResult?.ok
                    ? fulfillmentResult.fulfillment
                    : null
                }
                events={
                  fulfillmentResult?.ok ? fulfillmentResult.events : []
                }
                shipments={
                  shipmentsResult?.ok ? shipmentsResult.rows : []
                }
              />
            </div>
          </div>
        </>
      )}
    </SellerOpsShell>
  );
}
