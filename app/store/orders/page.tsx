import Link from "next/link";
import { redirect } from "next/navigation";
import BuyerOrderList from "../../components/store/BuyerOrderList";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { isOrderStatus } from "../../../lib/store/orderRules";
import { listBuyerOrders } from "../../../lib/store/orders";
import type { OrderStatus } from "../../../lib/store/types";

export const dynamic = "force-dynamic";

import { storeOrdersMetadata } from "../../../lib/site/routeMetadata";

export const metadata = storeOrdersMetadata;

type PageProps = {
  searchParams?:
    | Promise<{ status?: string }>
    | { status?: string };
};

const FILTERS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const STATUS_KEYS: Record<(typeof FILTERS)[number], TranslationKey> = {
  pending: "store.orders.status.pending",
  confirmed: "store.orders.status.confirmed",
  processing: "store.orders.status.processing",
  packed: "store.orders.status.packed",
  shipped: "store.orders.status.shipped",
  delivered: "store.orders.status.delivered",
  cancelled: "store.orders.status.cancelled",
};

export default async function StoreOrdersPage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeOrders)}`
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const statusFilter =
    params.status && isOrderStatus(params.status)
      ? (params.status as OrderStatus)
      : "all";

  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const result = await listBuyerOrders(supabase, user.id, {
    status: statusFilter,
    limit: 50,
  });

  return (
    <StoreShell title={t("store.orders.navTitle")} subtitle={t("store.orders.navSubtitle")} wide>
      <StorePageHeader
        eyebrow={t("store.orders.eyebrow")}
        title={t("store.orders.title")}
        description={t("store.orders.description")}
      >
        <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label={t("store.orders.filterAria")}>
          <Link
            href={APP_ROUTES.storeOrders}
            className={`sf-chip watch-focus-ring ${
              statusFilter === "all" ? "is-active" : ""
            }`}
            aria-current={statusFilter === "all" ? "page" : undefined}
          >
            {t("store.orders.all")}
          </Link>
          {FILTERS.map((status) => (
            <Link
              key={status}
              href={`${APP_ROUTES.storeOrders}?status=${status}`}
              className={`sf-chip watch-focus-ring ${
                statusFilter === status ? "is-active" : ""
              }`}
              aria-current={statusFilter === status ? "page" : undefined}
            >
              {t(STATUS_KEYS[status])}
            </Link>
          ))}
        </div>
      </StorePageHeader>

      <div className="mt-6">
        {!result.ok ? (
          <StoreErrorState message={result.message} />
        ) : (
          <BuyerOrderList orders={result.data} />
        )}
      </div>
    </StoreShell>
  );
}
