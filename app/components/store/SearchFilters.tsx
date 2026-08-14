"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ProductCategoryRow } from "../../../lib/store/types";
import { APP_ROUTES } from "../../lib/nav";

type SearchFiltersProps = {
  categories: ProductCategoryRow[];
  resultCount: number;
};

export default function SearchFilters({
  categories,
  resultCount,
}: SearchFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "newest";

  const queryString = useMemo(() => {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (category) next.set("category", category);
    if (sort && sort !== "newest") next.set("sort", sort);
    return next.toString();
  }, [q, category, sort]);

  const hasFilters = Boolean(q.trim() || category || (sort && sort !== "newest"));

  function push(updates: Record<string, string>) {
    const next = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${APP_ROUTES.storeSearch}?${qs}` : APP_ROUTES.storeSearch);
    });
  }

  const filters = (
    <div className="space-y-5">
      {q.trim() ? (
        <p className="text-sm text-[var(--sf-muted)]">
          Searching for{" "}
          <span className="font-semibold text-[var(--sf-ink)]">“{q.trim()}”</span>
        </p>
      ) : null}

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
          Category
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            selected={!category}
            onClick={() => push({ category: "" })}
          />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              selected={category === c.id}
              onClick={() => push({ category: c.id })}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="store-sort"
          className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]"
        >
          Sort
        </label>
        <select
          id="store-sort"
          value={sort}
          onChange={(e) => push({ sort: e.target.value })}
          className="sf-select mt-2"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {hasFilters ? (
        <button
          type="button"
          className="sf-btn sf-btn-ghost w-full"
          onClick={() => {
            startTransition(() => router.push(APP_ROUTES.storeSearch));
          }}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );

  return (
    <aside className="lg:sticky lg:top-28" aria-label="Search filters">
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <p className="text-sm text-[var(--sf-muted)]">
          {pending ? "Updating…" : `${resultCount} results`}
        </p>
        <button
          type="button"
          className="sf-btn sf-btn-ghost"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Hide filters" : "Filters"}
        </button>
      </div>

      <div
        className={`rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 backdrop-blur-xl ${
          mobileOpen ? "block" : "hidden lg:block"
        }`}
      >
        <p className="mb-4 hidden text-sm text-[var(--sf-muted)] lg:block">
          {pending ? "Updating…" : `${resultCount} results`}
        </p>
        {filters}
      </div>
    </aside>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`sf-chip watch-focus-ring ${selected ? "is-active" : ""}`}
    >
      {label}
    </button>
  );
}
