"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchWorldAction } from "../../actions/worldSearch";
import {
  WORLD_SEARCH_ENTITY_TYPES,
  type WorldSearchEntityType,
  type WorldSearchResult,
} from "../../../lib/world/domain";
import {
  EXACT_CONTEXT_RESTORE_EVENT,
  type ExactReturnContext,
} from "../../../lib/world/exactContext";
import type { WorldCategory, WorldCity } from "../../../lib/world/discovery";
import { worldSearchHoldMessage } from "../../../lib/world/holdUi";

export default function WorldSearchClient({
  cities,
  categories,
  enabled,
  databaseReady,
  initialQuery,
}: {
  cities: WorldCity[];
  categories: WorldCategory[];
  enabled: boolean;
  databaseReady: boolean;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState<WorldSearchEntityType | "">("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [results, setResults] = useState<WorldSearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function restore(event: Event) {
      const context = (event as CustomEvent<ExactReturnContext>).detail;
      if (context?.currentSearch) setQuery(context.currentSearch);
      const filters = context?.selectedFilters;
      if (filters?.city && cities.some((city) => city.id === filters.city)) {
        setCityId(filters.city);
      }
      if (
        filters?.category &&
        categories.some((category) => category.id === filters.category)
      ) {
        setCategoryId(filters.category);
      }
    }
    window.addEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
    return () => window.removeEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
  }, [categories, cities]);

  function runSearch() {
    setMessage(null);
    startTransition(async () => {
      const response = await searchWorldAction({
        query,
        entityTypes: entityType ? [entityType] : undefined,
        cityId: cityId || undefined,
        categoryId: categoryId || undefined,
      });
      if (!response.ok) {
        setResults([]);
        setMessage(response.message);
        return;
      }
      setResults(response.results);
      setMessage(response.results.length ? null : "No matching World results.");
    });
  }

  if (!enabled) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm text-blue-100"
      >
        {worldSearchHoldMessage(databaseReady)}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="text-xs font-bold text-white/45">Search World</span>
            <input
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              placeholder="City, place, hotel, restaurant…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-bold text-white/45">Type</span>
            <select
              value={entityType}
              onChange={(event) =>
                setEntityType(event.target.value as WorldSearchEntityType | "")
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              <option value="">Everything</option>
              {WORLD_SEARCH_ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-bold text-white/45">City</span>
            <select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.city_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-56">
            <span className="text-xs font-bold text-white/45">Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={runSearch}
            disabled={!enabled || pending || query.trim().length < 2}
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-40"
          >
            {pending ? "Searching…" : "Search"}
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-white/50">{message}</p> : null}
      <section className="grid gap-3 md:grid-cols-2">
        {results.map((result) => {
          const href =
            result.entity_type === "city"
              ? `/world/city/${encodeURIComponent(result.slug)}`
              : result.entity_type === "country" ||
                  result.entity_type === "category"
                ? null
                : `/world/place/${encodeURIComponent(result.slug)}`;
          const content = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
                {result.entity_type.replace(/_/g, " ")}
              </p>
              <h2 className="mt-1 text-lg font-black">{result.title}</h2>
              {result.subtitle ? (
                <p className="mt-1 text-xs text-white/45">{result.subtitle}</p>
              ) : null}
            </>
          );
          return href ? (
            <Link
              key={`${result.entity_type}:${result.entity_id}`}
              href={href}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06]"
            >
              {content}
            </Link>
          ) : (
            <article
              key={`${result.entity_type}:${result.entity_id}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              {content}
            </article>
          );
        })}
      </section>
    </div>
  );
}
