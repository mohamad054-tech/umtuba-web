import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";

type ProfileProductsPanelProps = {
  isOwner?: boolean;
};

/**
 * Stub panel only — full Products catalog UI is out of scope (Creator Hub readiness).
 */
export default function ProfileProductsPanel({
  isOwner = false,
}: ProfileProductsPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
        Products
      </p>
      <p className="mt-3 text-base font-bold text-white/80">No products yet</p>
      <p className="mt-2 text-sm text-white/45">
        {isOwner
          ? "Listed products will appear here. Open Seller products when your shop is ready."
          : "This creator has not listed products yet."}
      </p>
      {isOwner ? (
        <Link
          href={APP_ROUTES.sellerProducts}
          className="watch-focus-ring mt-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold transition hover:bg-white/10"
        >
          Seller products
        </Link>
      ) : null}
    </div>
  );
}
