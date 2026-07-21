"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { discoverWorldPlacesAction } from "../actions/worldDiscovery";
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

const PERMISSION_COPY: Record<LocationPermissionState, string> = {
  not_requested: "Location has not been requested.",
  granted: "One-time location granted. It is not stored.",
  denied: "Location denied. Choose a destination instead.",
  unavailable: "Location is unavailable. Choose a destination instead.",
  destination_only: "Destination-only discovery — no device location used.",
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
  const [permission, setPermission] =
    useState<LocationPermissionState>("not_requested");
  const [cityId, setCityId] = useState(
    () =>
      cities.find((city) => city.slug === initialCitySlug)?.id ??
      cities[0]?.id ??
      ""
  );
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
        result.places.length
          ? null
          : "No approved public places match this destination."
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
            result.places.length
              ? null
              : "No approved public places are nearby."
          );
        });
      },
      (error) => {
        setPermission(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  if (!databaseReady || !flags.worldDiscoveryEnabled) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm text-blue-100"
        >
          {databaseReady
            ? "World Discovery is prepared but disabled pending platform approval."
            : "World Discovery database migrations are not available in this environment yet."}
        </p>
        <p className="text-sm text-white/45">
          No location permission is requested while Discovery is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
        <h2 className="text-xl font-black">Choose where to explore</h2>
        <p className="mt-2 text-sm text-white/50">
          Device location is optional. Manual country/city discovery always
          remains available when World Discovery is enabled.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs font-bold text-white/55">
            Destination
            <select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              {cities.length === 0 ? (
                <option value="">No curated destinations yet</option>
              ) : null}
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.city_name}, {city.country_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-white/55">
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              <option value="">All categories</option>
              {categoryOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.depth ? `— ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-white/55">
            Radius: {radius} km
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
            {pending ? "Searching…" : "Explore destination"}
          </button>
          {flags.nearbyPlacesEnabled ? (
            <button
              type="button"
              disabled={pending}
              onClick={runNearbyDiscovery}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              Use my location once
            </button>
          ) : null}
          {selectedCity ? (
            <Link
              href={`/world/city/${encodeURIComponent(selectedCity.slug)}`}
              className="watch-focus-ring rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100"
            >
              Open city profile
            </Link>
          ) : null}
          <Link
            href="/world/search"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
          >
            Search World
          </Link>
        </div>

        <p className="mt-3 text-xs text-white/45">
          {PERMISSION_COPY[permission]} No continuous tracking is used.
        </p>
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
                    {place.category} · verified
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
          <h2 className="text-xl font-black">Hello City</h2>
          <p className="mt-2 text-sm text-white/55">
            Publishing is explicit, moderated and city-level only.
          </p>
        </section>
      ) : null}
    </div>
  );
}
