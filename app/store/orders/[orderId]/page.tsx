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
  params: Promise<{ orderId: string }> | { orderId: string };
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
    <StoreShell title="Order" subtitle="Store" wide>
      <div className="mt-4">
        <Link
          href={APP_ROUTES.storeOrders}
          className="text-sm font-bold text-white/50 hover:text-white/80"
        >
          ← Back to my orders
        </Link>
      </div>
      {!result.ok ? (
        <div className="mt-6">
          <StoreErrorState message={result.message} />
        </div>
      ) : (
        <OrderDetailView bundle={result.data} mode="buyer" />
      )}
    </StoreShell>
  );
}
