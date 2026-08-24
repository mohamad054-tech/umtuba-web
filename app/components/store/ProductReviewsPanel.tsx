import { submitStoreProductReviewAction } from "../../actions/storeReviews";
import type { ProductReviewRow } from "../../../lib/store/productReviews";
import { publicReviewAverage } from "../../../lib/store/productReviews";

type ProductReviewsPanelProps = {
  productId: string;
  storeSlug: string;
  productSlug: string;
  reviews: ProductReviewRow[];
  title: string;
  empty: string;
  canWrite: boolean;
  writeLabel: string;
  submitLabel: string;
  deliveredOnly: string;
  eligibleOrderId?: string | null;
};

export default function ProductReviewsPanel({
  productId,
  storeSlug,
  productSlug,
  reviews,
  title,
  empty,
  canWrite,
  writeLabel,
  submitLabel,
  deliveredOnly,
  eligibleOrderId,
}: ProductReviewsPanelProps) {
  const average = publicReviewAverage(reviews);

  return (
    <section
      data-testid="product-reviews"
      className="mt-10 rounded-[28px] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {average != null ? (
          <p className="text-sm text-[var(--sf-muted)]">
            {average.toFixed(1)} / 5 · {reviews.length}
          </p>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--sf-faint)]">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3"
            >
              <p className="text-sm font-bold">{review.rating} / 5</p>
              {review.body ? (
                <p className="mt-2 text-sm leading-6 text-[var(--sf-muted)]">
                  {review.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canWrite && eligibleOrderId ? (
        <form
          action={async (formData) => {
            await submitStoreProductReviewAction(formData);
          }}
          className="mt-6 space-y-3"
        >
          <input type="hidden" name="order_id" value={eligibleOrderId} />
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="store_slug" value={storeSlug} />
          <input type="hidden" name="product_slug" value={productSlug} />
          <p className="text-sm font-semibold">{writeLabel}</p>
          <label className="block text-sm">
            <select
              name="rating"
              required
              className="mt-1 rounded-full border border-[var(--sf-line)] bg-transparent px-3 py-2"
              defaultValue="5"
            >
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>
          <textarea
            name="body"
            minLength={8}
            maxLength={4000}
            rows={3}
            className="w-full rounded-2xl border border-[var(--sf-line)] bg-transparent px-3 py-2 text-sm"
          />
          <button type="submit" className="sf-btn sf-btn-ghost">
            {submitLabel}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-[var(--sf-faint)]">{deliveredOnly}</p>
      )}
    </section>
  );
}
