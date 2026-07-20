"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleStoreCouponStatusAction,
  upsertStoreCouponAdminAction,
} from "../../actions/storePromotionsAdmin";
import {
  formatCouponCampaignWindow,
  formatCouponDiscountSummary,
  formatCouponTargetingSummary,
  formatCouponType,
  formatCouponUsageStats,
  type CouponTargetingSummary,
} from "../../../lib/store/adminUiHelpers";
import type { StoreCouponRow } from "../../../lib/store/promotionsFulfillment";
import { PROMOTION_DISCOUNT_TYPES } from "../../../lib/store/promotionRules";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type Props = {
  storeId: string;
  coupons: StoreCouponRow[];
  targetingByCouponId: Record<string, CouponTargetingSummary>;
  canManage: boolean;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponAdminClient({
  storeId,
  coupons,
  targetingByCouponId,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<string>("percent");

  const editing = useMemo(
    () => coupons.find((c) => c.id === editingId) ?? null,
    [coupons, editingId]
  );

  function resetFlash() {
    setError(null);
    setMessage(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    resetFlash();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertStoreCouponAdminAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(editingId ? "Coupon updated." : "Coupon created.");
      setEditingId(null);
      router.refresh();
    });
  }

  function onToggle(coupon: StoreCouponRow) {
    if (pending) return;
    const nextActive = coupon.status !== "active";
    const label = nextActive ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} coupon ${coupon.code}?`)) {
      return;
    }
    resetFlash();
    const formData = new FormData();
    formData.set("store_id", storeId);
    formData.set("coupon_id", coupon.id);
    formData.set(
      "status",
      coupon.status === "active" ? "disabled" : "active"
    );
    startTransition(async () => {
      const result = await toggleStoreCouponStatusAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(
        coupon.status === "active" ? "Coupon deactivated." : "Coupon activated."
      );
      router.refresh();
    });
  }

  function startEdit(coupon: StoreCouponRow) {
    setEditingId(coupon.id);
    setDiscountType(coupon.discount_type);
    resetFlash();
  }

  return (
    <div className="mt-6 space-y-6" aria-busy={pending || undefined}>
      <div aria-live="assertive">
        {error ? <StoreErrorState message={error} /> : null}
      </div>
      {message ? (
        <p role="status" className="text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black tracking-tight">
          {editing ? `Edit ${editing.code}` : "Create coupon"}
        </h2>
        {!canManage ? (
          <p className="mt-3 text-sm text-white/45">
            Owner or manager role required to manage coupons.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="store_id" value={storeId} />
            {editing ? (
              <input type="hidden" name="coupon_id" value={editing.id} />
            ) : null}
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Code
              </span>
              <input
                name="code"
                required
                defaultValue={editing?.code ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Status
              </span>
              <select
                name="status"
                defaultValue={editing?.status ?? "active"}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Type
              </span>
              <select
                name="discount_type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              >
                {PROMOTION_DISCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatCouponType(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Promotion name
              </span>
              <input
                name="promotion_name"
                defaultValue={editing?.promotion_name ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            {discountType === "percent" ? (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Percent (bps, 1000 = 10%)
                </span>
                <input
                  name="percent_bps"
                  type="number"
                  min={1}
                  max={10000}
                  defaultValue={editing?.percent_bps ?? 1000}
                  disabled={pending}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
                />
              </label>
            ) : null}
            {discountType === "fixed" ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Fixed amount (minor)
                  </span>
                  <input
                    name="fixed_amount_minor"
                    type="number"
                    min={0}
                    defaultValue={editing?.fixed_amount_minor ?? 0}
                    disabled={pending}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Currency
                  </span>
                  <input
                    name="currency"
                    defaultValue={editing?.currency ?? "USD"}
                    maxLength={3}
                    disabled={pending}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm uppercase outline-none focus:border-blue-400/40"
                  />
                </label>
              </>
            ) : null}
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Min order (minor)
              </span>
              <input
                name="min_subtotal_minor"
                type="number"
                min={0}
                defaultValue={editing?.min_subtotal_minor ?? 0}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            {discountType === "percent" ? (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Max discount (minor)
                </span>
                <input
                  name="max_discount_minor"
                  type="number"
                  min={0}
                  defaultValue={editing?.max_discount_minor ?? ""}
                  disabled={pending}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
                />
              </label>
            ) : null}
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Starts at
              </span>
              <input
                name="starts_at"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(editing?.starts_at ?? null)}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Ends at
              </span>
              <input
                name="ends_at"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(editing?.ends_at ?? null)}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Total usage limit
              </span>
              <input
                name="total_usage_limit"
                type="number"
                min={1}
                defaultValue={editing?.total_usage_limit ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Per-user limit
              </span>
              <input
                name="per_user_usage_limit"
                type="number"
                min={1}
                defaultValue={editing?.per_user_usage_limit ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="md:col-span-2 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Description
              </span>
              <textarea
                name="promotion_description"
                rows={2}
                defaultValue={editing?.promotion_description ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-blue-400/40"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending}
                className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
              >
                {pending ? "Saving…" : editing ? "Save coupon" : "Create coupon"}
              </button>
              {editing ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setEditingId(null)}
                  className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black tracking-tight">Coupons</h2>
        {coupons.length === 0 ? (
          <div className="mt-4">
            <StoreEmptyState
              title="No coupons yet"
              description="Create a percentage, fixed, or free-shipping coupon to start a campaign."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {coupons.map((coupon) => {
              const targeting = targetingByCouponId[coupon.id];
              return (
                <li
                  key={coupon.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-tight">
                        {coupon.code}
                      </p>
                      <p className="mt-1 text-sm text-white/55">
                        {formatCouponType(coupon.discount_type)} ·{" "}
                        {formatCouponDiscountSummary(coupon)}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Status: {coupon.status} ·{" "}
                        {formatCouponCampaignWindow(coupon)}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {formatCouponUsageStats(coupon)}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Targeting: {formatCouponTargetingSummary(targeting)}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => startEdit(coupon)}
                          className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        {coupon.status === "active" ||
                        coupon.status === "disabled" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onToggle(coupon)}
                            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-50"
                          >
                            {coupon.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
