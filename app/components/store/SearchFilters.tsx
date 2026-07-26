"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ProductCategoryRow } from "../../../lib/store/types";

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

  function push(updates: Record<string, string>) {
    const next = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/store/search?${qs}` : "/store/search");
    });
  }

  const filters = (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="store-search-q"
          className="text-xs font-bold uppercase tracking-[0.16em] text-white/45"
        >
          Search
        </label>
        <input
          id="store-search-q"
          name="q"
          defaultValue={q}
          placeholder="Search products"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              push({ q: (e.target as HTMLInputElement).value });
            }
          }}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3.5 text-sm outline-none transition focus:border-violet-400/50"
        />
      </div>

      <fieldset>
        <legend className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Category
        </legend>
        <div className="mt-2 space-y-1.5">
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
          className="text-xs font-bold uppercase tracking-[0.16em] text-white/45"
        >
          Sort
        </label>
        <select
          id="store-sort"
          value={sort}
          onChange={(e) => push({ sort: e.target.value })}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-3.5 text-sm outline-none focus:border-violet-400/50"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
    </div>
  );

  return (
    <aside className="lg:sticky lg:top-20" aria-label="Search filters">
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <p className="text-sm text-white/50">
          {pending ? "Updating…" : `${resultCount} results`}
        </p>
        <button
          type="button"
          className="watch-focus-ring rounded-full border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-xs font-bold text-violet-100"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Hide filters" : "Filters"}
        </button>
      </div>

      <div
        className={`rounded-[24px] border border-white/10 bg-[#080816]/85 p-4 backdrop-blur-xl ${
          mobileOpen ? "block" : "hidden lg:block"
        }`}
      >
        <p className="mb-4 hidden text-sm text-white/45 lg:block">
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
      className={`watch-focus-ring mr-1.5 mt-1.5 inline-flex rounded-full px-3 py-1.5 text-xs font-bold transition ${
        selected
          ? "bg-violet-500 text-white"
          : "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
