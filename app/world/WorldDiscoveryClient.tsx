"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { discoverWorldPlacesAction } from "../actions/worldDiscovery";
import { useTranslation } from "../components/i18n";
import ExternalDirectionsLink from "../components/world/ExternalDirectionsLink";
import {
  EXACT_CONTEXT_RESTORE_EVENT,
  type ExactReturnContext,
} from "../../lib/world/exactContext";
import {
  type DiscoveredPlace,
  type WorldCategory,
  type WorldCity,
  type WorldFeatureFlags,
} from "../../lib/world/discovery";
import { worldDiscoveryHoldMessage } from "../../lib/world/holdUi";
import { resolveWorldDestination } from "../../lib/world/worldDestination";

type LocationPermissionState =
  | "not_requested"
  | "granted"
  | "denied"
  | "unavailable"
  | "destination_only";

type Props = {
  cities: WorldCity[];
  categories: WorldCategory[];
  flags: WorldFeatureFlags;
  databaseReady: boolean;
  initialCitySlug?: string | null;
  initialCategoryId?: string | null;
  initialRadius?: number | null;
};

export default function WorldDiscoveryClient({
  cities,
  categories,
  flags,
  databaseReady,
  initialCitySlug,
  initialCategoryId,
  initialRadius,
}: Props) {
  const { locale, t } = useTranslation();
  const permissionCopy: Record<LocationPermissionState, string> = {
    not_requested: t("world.location.notRequested"),
    granted: t("world.location.granted"),
    denied: t("world.location.denied"),
    unavailable: t("world.location.unavailable"),
    destination_only: t("world.location.destinationOnly"),
  };
  const [permission, setPermission] =
    useState<LocationPermissionState>("not_requested");
  const initialDestination = resolveWorldDestination(cities, initialCitySlug);
  const [cityId, setCityId] = useState(initialDestination.cityId);
  const [unknownRequested, setUnknownRequested] = useState(
    initialDestination.unknownRequested
  );
  const requestedUnknownSlug = initialDestination.requestedSlug;
  const [categoryId, setCategoryId] = useState(
    () =>
      categories.some((category) => category.id === initialCategoryId)
        ? initialCategoryId!
        : ""
  );
  const [radius, setRadius] = useState(() =>
    initialRadius && initialRadius >= 1 && initialRadius <= 100
      ? initialRadius
      : 25
  );
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = cities.find((city) => city.id === cityId) ?? null;
  const categoryOptions = useMemo(() => {
    const roots = categories.filter((category) => !category.parent_id);
    return roots.flatMap((root) => [
      { ...root, depth: 0 },
      ...categories
        .filter((category) => category.parent_id === root.id)
        .map((category) => ({ ...category, depth: 1 })),
    ]);
  }, [categories]);

  useEffect(() => {
    function restore(event: Event) {
      const detail = (event as CustomEvent<ExactReturnContext>).detail;
      const filters = detail?.selectedFilters;
      if (!filters) return;
      if (cities.some((city) => city.id === filters.city)) {
        setCityId(filters.city);
      }
      if (
        filters.category &&
        categories.some((category) => category.id === filters.category)
      ) {
        setCategoryId(filters.category);
      }
      const nextRadius = Number(filters.radius);
      if (Number.isFinite(nextRadius) && nextRadius >= 1 && nextRadius <= 100) {
        setRadius(nextRadius);
      }
    }
    window.addEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
    return () => window.removeEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
  }, [categories, cities]);

  function runDestinationDiscovery() {
    if (!cityId || pending) return;
    const params = new URLSearchParams(searchParams);
    const city = cities.find((item) => item.id === cityId);
    if (city) params.set("city", city.slug);
    if (categoryId) params.set("category", categoryId);
    else params.delete("category");
    params.set("radius", String(radius));
    params.set("tab", "places");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setPermission("destination_only");
    setMessage(null);
    startTransition(async () => {
      const result = await discoverWorldPlacesAction({
        destinationCityId: cityId,
        categoryId: categoryId || undefined,
        radiusKm: radius,
      });
      if (!result.ok) {
        setPlaces([]);
        setMessage(result.message);
        return;
      }
      setPlaces(result.places);
      setMessage(
        result.places.length ? null : t("world.empty.destination")
      );
    });
  }

  function runNearbyDiscovery() {
    if (pending || !flags.nearbyPlacesEnabled) return;
    if (!navigator.geolocation) {
      setPermission("unavailable");
      return;
    }
    setMessage(null);
    const params = new URLSearchParams(searchParams);
    params.delete("city");
    if (categoryId) params.set("category", categoryId);
    else params.delete("category");
    params.set("radius", String(radius));
    params.set("tab", "places");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermission("granted");
        startTransition(async () => {
          const result = await discoverWorldPlacesAction({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            categoryId: categoryId || undefined,
            radiusKm: radius,
          });
          if (!result.ok) {
            setPlaces([]);
            setMessage(result.message);
            return;
          }
          setPlaces(result.places);
          setMessage(
            result.places.length ? null : t("world.empty.nearby")
          );
        });
      },
      (error) => {
        setPermission(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (!databaseReady || !flags.worldDiscoveryEnabled) return;
    if (!initialCitySlug || !cityId || unknownRequested) return;
    autoStarted.current = true;
    runDestinationDiscovery();
  }, [databaseReady, flags.worldDiscoveryEnabled, initialCitySlug, cityId]);

  if (!databaseReady || !flags.worldDiscoveryEnabled) {
    const requestedCity = initialCitySlug?.trim() || null;
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm text-blue-100"
        >
          {worldDiscoveryHoldMessage(databaseReady, locale)}
        </p>
        {requestedCity ? (
          <p className="text-sm text-white/70">
            {t("world.requestedDestination", { values: { city: requestedCity } })}
          </p>
        ) : null}
        <p className="text-sm text-white/45">
          {t("world.location.holdNoPermission")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
          >
            {t("world.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
        <h2 className="text-xl font-black">{t("world.chooseWhere")}</h2>
        <p className="mt-2 text-sm text-white/50">
          {t("world.chooseWhereHelp")}
        </p>
        {unknownRequested && requestedUnknownSlug ? (
          <p role="status" className="mt-3 text-sm text-amber-100/90">
            {t("world.empty.unknownDestination", {
              values: { city: requestedUnknownSlug },
            })}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs font-bold text-white/55">
            {t("world.destination")}
            <select
              value={cityId}
              onChange={(event) => {
                setCityId(event.target.value);
                setUnknownRequested(false);
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              {cities.length === 0 ? (
                <option value="">{t("world.empty.cities")}</option>
              ) : null}
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.city_name}, {city.country_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-white/55">
            {t("world.category")}
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              <option value="">{t("world.allCategories")}</option>
              {categoryOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.depth ? `— ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-white/55">
            {t("world.radiusKm", { values: { radius } })}
            <input
              type="range"
              min={1}
              max={100}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="mt-3 w-full"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              pending ||
              !databaseReady ||
              !flags.worldDiscoveryEnabled ||
              !cityId
            }
            onClick={runDestinationDiscovery}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-40"
          >
            {pending ? t("world.searching") : t("world.exploreDestination")}
          </button>
          {flags.nearbyPlacesEnabled ? (
            <button
              type="button"
              disabled={pending}
              onClick={runNearbyDiscovery}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              {t("world.useLocationOnce")}
            </button>
          ) : null}
          {selectedCity ? (
            <Link
              href={`/world/city/${encodeURIComponent(selectedCity.slug)}`}
              className="watch-focus-ring rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100"
            >
              {t("world.openCity")}
            </Link>
          ) : null}
          <Link
            href="/world/search"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
          >
            {t("world.searchWorld")}
          </Link>
        </div>

        <p className="mt-3 text-xs text-white/45">
          {permissionCopy[permission]} {t("world.location.noTracking")}
        </p>

        {cities.length ? (
          <ul
            aria-label={t("world.destination")}
            className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {cities.map((city) => {
              const selected = city.id === cityId;
              return (
                <li key={city.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCityId(city.id);
                      setUnknownRequested(false);
                    }}
                    className={`watch-focus-ring w-full rounded-2xl border p-4 text-left ${
                      selected
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
                      {city.country_name}
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {city.city_name}
                    </p>
                  </button>
                  <Link
                    href={`/world/city/${encodeURIComponent(city.slug)}`}
                    className="mt-2 inline-flex text-xs font-bold text-cyan-100 hover:underline"
                  >
                    {t("world.openCity")}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {message ? (
        <p role="status" className="text-sm text-white/55">
          {message}
        </p>
      ) : null}

      {places.length ? (
        <section aria-label="Discovered places" className="grid gap-3 md:grid-cols-2">
          {places.map((place) => (
            <article
              key={place.place_id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
                    {place.category} · {t("world.verified")}
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    <Link
                      href={`/world/place/${encodeURIComponent(place.slug)}`}
                      className="hover:text-cyan-100"
                    >
                      {place.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-white/45">
                    {place.city_name}, {place.country_name} ·{" "}
                    {place.distance_km.toFixed(1)} km
                  </p>
                </div>
                <ExternalDirectionsLink
                  enabled={flags.externalDirectionsEnabled}
                  destination={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                    label: place.name,
                  }}
                  selectedTab="places"
                  selectedFilters={{
                    city: cityId,
                    category: categoryId || "all",
                    radius: String(radius),
                  }}
                  openPlaceId={place.place_id}
                  openCityId={place.city_id}
                />
              </div>
              {place.address_display ? (
                <p className="mt-3 text-sm text-white/55">
                  {place.address_display}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {flags.helloCityEnabled ? (
        <section className="rounded-[28px] border border-violet-400/20 bg-violet-500/5 p-5">
          <h2 className="text-xl font-black">{t("world.helloCity")}</h2>
          <p className="mt-2 text-sm text-white/55">
            {t("world.helloCityHelp")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
