import Link from "next/link";
import { redirect } from "next/navigation";
import OrderDetailView from "../../../components/store/OrderDetailView";
import StoreErrorState from "../../../components/store/StoreErrorState";
import StoreShell from "../../../components/store/StoreShell";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { getBuyerOrderDetail } from "../../../../lib/store/orders";

export const metadata = {
  title: "Order detail | UMTUBA Store",
};

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function StoreOrderDetailPage({ params }: PageProps) {
  const user = await getServerUser();
  const { orderId } = await Promise.resolve(params);
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(
        `${APP_ROUTES.storeOrders}/${orderId}`
      )}`
    );
  }

  const supabase = await createClient();
  const result = await getBuyerOrderDetail(supabase, user.id, orderId);

  return (
    <StoreShell
      title={result.ok ? result.data.order.order_number : "Order"}
      subtitle="Store"
      wide
    >
      <div className="mt-4">
        <Link
          href={APP_ROUTES.storeOrders}
          className="sf-btn sf-btn-ghost"
        >
          ← Back to my orders
        </Link>
      </div>
      {!result.ok ? (
        <div className="mt-6 space-y-4">
          <StoreErrorState message={result.message} />
          <p className="text-sm text-[var(--sf-faint)]">
            If this order belongs to another account, it will not be shown.
            Continue from{" "}
            <Link
              href={APP_ROUTES.storeOrders}
              className="font-semibold text-[var(--sf-accent-strong)]"
            >
              My orders
            </Link>{" "}
            or the{" "}
            <Link
              href={APP_ROUTES.store}
              className="font-semibold text-[var(--sf-accent-strong)]"
            >
              Store
            </Link>
            .
          </p>
        </div>
      ) : (
        <OrderDetailView bundle={result.data} mode="buyer" />
      )}
    </StoreShell>
  );
}
