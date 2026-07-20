"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertShippingProviderAdminAction,
  upsertShippingRateAdminAction,
  upsertShippingZoneAdminAction,
} from "../../actions/storePromotionsAdmin";
import { formatCountryCodes } from "../../../lib/store/adminUiHelpers";
import {
  DEFAULT_SHIPPING_PROVIDER_CATALOG,
  SHIPPING_PROVIDER_LABELS,
  SHIPPING_SERVICE_TYPES,
} from "../../../lib/store/shippingProviders";
import type {
  ShippingProviderRow,
  ShippingRateRow,
  ShippingZoneRow,
} from "../../../lib/store/promotionsFulfillment";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type Props = {
  storeId: string;
  providers: ShippingProviderRow[];
  zones: ShippingZoneRow[];
  ratesByZoneId: Record<string, ShippingRateRow[]>;
  canManage: boolean;
};

export default function ShippingAdminClient({
  storeId,
  providers,
  zones,
  ratesByZoneId,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );
  const rates = selectedZone ? ratesByZoneId[selectedZone.id] ?? [] : [];

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>,
    formData: FormData,
    success: string
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.message ?? "Request failed.");
        return;
      }
      setMessage(success);
      router.refresh();
    });
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
        <h2 className="text-xl font-black tracking-tight">Shipping providers</h2>
        <p className="mt-2 text-sm text-white/45">
          Configure provider priority and availability. No carrier APIs are
          called in this foundation.
        </p>
        {providers.length === 0 ? (
          <div className="mt-4">
            <StoreEmptyState
              title="No providers configured"
              description="Add a manual or carrier provider key to start quoting zones."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {providers.map((provider) => (
              <li
                key={provider.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{provider.display_name}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {SHIPPING_PROVIDER_LABELS[
                        provider.provider_key as keyof typeof SHIPPING_PROVIDER_LABELS
                      ] ?? provider.provider_key}{" "}
                      · priority {provider.sort_priority} ·{" "}
                      {provider.enabled ? "enabled" : "disabled"}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Tracking {provider.supports_tracking ? "yes" : "no"} ·
                      Pickup {provider.supports_pickup ? "yes" : "no"} · Intl{" "}
                      {provider.supports_international ? "yes" : "no"}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <form
                        className="flex items-end gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(
                            upsertShippingProviderAdminAction,
                            new FormData(e.currentTarget),
                            "Priority updated."
                          );
                        }}
                      >
                        <input type="hidden" name="store_id" value={storeId} />
                        <input
                          type="hidden"
                          name="provider_id"
                          value={provider.id}
                        />
                        <input
                          type="hidden"
                          name="provider_key"
                          value={provider.provider_key}
                        />
                        <input
                          type="hidden"
                          name="display_name"
                          value={provider.display_name}
                        />
                        <input
                          type="hidden"
                          name="enabled"
                          value={provider.enabled ? "1" : "0"}
                        />
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Priority
                          </span>
                          <input
                            name="sort_priority"
                            type="number"
                            min={0}
                            defaultValue={provider.sort_priority}
                            disabled={pending}
                            className="w-20 rounded-xl border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={pending}
                          className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        >
                          Set
                        </button>
                      </form>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          run(
                            upsertShippingProviderAdminAction,
                            fd,
                            provider.enabled
                              ? "Provider disabled."
                              : "Provider enabled."
                          );
                        }}
                      >
                        <input type="hidden" name="store_id" value={storeId} />
                        <input
                          type="hidden"
                          name="provider_id"
                          value={provider.id}
                        />
                        <input
                          type="hidden"
                          name="provider_key"
                          value={provider.provider_key}
                        />
                        <input
                          type="hidden"
                          name="display_name"
                          value={provider.display_name}
                        />
                        <input
                          type="hidden"
                          name="sort_priority"
                          value={String(provider.sort_priority)}
                        />
                        <input
                          type="hidden"
                          name="enabled"
                          value={provider.enabled ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          disabled={pending}
                          className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold disabled:opacity-50"
                        >
                          {provider.enabled ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            className="mt-5 grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                upsertShippingProviderAdminAction,
                new FormData(e.currentTarget),
                "Provider saved."
              );
            }}
          >
            <input type="hidden" name="store_id" value={storeId} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Provider
              </span>
              <select
                name="provider_key"
                required
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              >
                {DEFAULT_SHIPPING_PROVIDER_CATALOG.map((p) => (
                  <option key={p.providerKey} value={p.providerKey}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Display name
              </span>
              <input
                name="display_name"
                required
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Priority (lower first)
              </span>
              <input
                name="sort_priority"
                type="number"
                min={0}
                defaultValue={100}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" name="enabled" value="1" defaultChecked />
              Enabled
            </label>
            <button
              type="submit"
              disabled={pending}
              className="watch-focus-ring md:col-span-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
            >
              Save provider
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black tracking-tight">Shipping zones</h2>
        {zones.length === 0 ? (
          <div className="mt-4">
            <StoreEmptyState
              title="No zones yet"
              description="Create a zone with country codes to attach rates and providers."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {zones.map((zone) => (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`watch-focus-ring w-full rounded-2xl border px-4 py-3 text-left ${
                    selectedZoneId === zone.id
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p className="font-bold">{zone.name}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {formatCountryCodes(zone.country_codes)}
                    {zone.region_codes?.length
                      ? ` · regions ${zone.region_codes.join(", ")}`
                      : ""}{" "}
                    · {zone.enabled ? "enabled" : "disabled"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            key={selectedZone?.id ?? "new-zone"}
            className="mt-5 grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                upsertShippingZoneAdminAction,
                new FormData(e.currentTarget),
                selectedZone ? "Zone updated." : "Zone saved."
              );
            }}
          >
            <input type="hidden" name="store_id" value={storeId} />
            {selectedZone ? (
              <input type="hidden" name="zone_id" value={selectedZone.id} />
            ) : null}
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Zone name
              </span>
              <input
                name="name"
                required
                defaultValue={selectedZone?.name ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Countries (comma-separated ISO)
              </span>
              <input
                name="country_codes"
                placeholder="US, CA"
                required
                defaultValue={selectedZone?.country_codes?.join(", ") ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm uppercase"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Regions (optional)
              </span>
              <input
                name="region_codes"
                placeholder="CA, NY"
                defaultValue={selectedZone?.region_codes?.join(", ") ?? ""}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm uppercase"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                name="enabled"
                value="1"
                defaultChecked={selectedZone?.enabled ?? true}
              />
              Enabled
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending}
                className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
              >
                {selectedZone ? "Update zone" : "Create zone"}
              </button>
              {selectedZone ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSelectedZoneId("")}
                  className="watch-focus-ring rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white/80"
                >
                  New zone
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black tracking-tight">
          Rates{selectedZone ? ` · ${selectedZone.name}` : ""}
        </h2>
        {!selectedZone ? (
          <p className="mt-3 text-sm text-white/45">Select a zone to manage rates.</p>
        ) : rates.length === 0 ? (
          <div className="mt-4">
            <StoreEmptyState
              title="No rates in this zone"
              description="Add a service type and fee in minor units."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {rates.map((rate) => {
              const provider = providers.find((p) => p.id === rate.provider_id);
              return (
                <li
                  key={rate.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <p className="font-bold">
                    {rate.service_type} · {rate.fee_minor} {rate.currency}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Provider: {provider?.display_name ?? "Unassigned"} ·{" "}
                    {rate.enabled ? "enabled" : "disabled"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {canManage && selectedZone ? (
          <form
            className="mt-5 grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                upsertShippingRateAdminAction,
                new FormData(e.currentTarget),
                "Rate saved."
              );
            }}
          >
            <input type="hidden" name="store_id" value={storeId} />
            <input type="hidden" name="zone_id" value={selectedZone.id} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Service type
              </span>
              <select
                name="service_type"
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              >
                {SHIPPING_SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Provider
              </span>
              <select
                name="provider_id"
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              >
                <option value="">Unassigned</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Fee (minor units)
              </span>
              <input
                name="fee_minor"
                type="number"
                min={0}
                required
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Currency
              </span>
              <input
                name="currency"
                defaultValue="USD"
                maxLength={3}
                disabled={pending}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm uppercase"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="watch-focus-ring md:col-span-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
            >
              Save rate
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
