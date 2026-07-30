import Link from "next/link";
import { redirect } from "next/navigation";
import BuyerDigitalAccessLibrary from "../../../components/store/BuyerDigitalAccessLibrary";
import StoreErrorState from "../../../components/store/StoreErrorState";
import StoreShell from "../../../components/store/StoreShell";
import { APP_ROUTES } from "../../../lib/nav";
import { listBuyerDigitalAccessLibrary } from "../../../../lib/store/buyerDigitalPostPurchase";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

export const metadata = {
  title: "Digital Access | UMTUBA Store",
  description: "Secure digital access for your paid purchases.",
};

export default async function StoreDigitalAccessPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeDigitalAccess)}`
    );
  }

  const supabase = await createClient();
  const result = await listBuyerDigitalAccessLibrary(supabase, { limit: 50 });

  return (
    <StoreShell title="Digital Access" subtitle="Store" wide>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Post-purchase</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Digital access
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Secure short-lived access for paid digital purchases across your
          orders. Access opens only for active entitlements you own.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={APP_ROUTES.storeOrders}
            className="text-sm font-semibold text-[var(--sf-accent-strong)]"
          >
            ← My orders
          </Link>
        </div>
      </header>

      <div className="mt-6">
        {!result.ok ? (
          <StoreErrorState message={result.message} />
        ) : (
          <BuyerDigitalAccessLibrary items={result.items} />
        )}
      </div>
    </StoreShell>
  );
}
