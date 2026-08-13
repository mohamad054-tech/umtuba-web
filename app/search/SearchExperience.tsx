"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  clearRecentSearchesAction,
  globalSearchAction,
  recentSearchesAction,
} from "../actions/search";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import ProductLoadingState from "../components/product/ProductLoadingState";
import { APP_ROUTES } from "../lib/nav";
import {
  SEARCH_TAB_LABELS,
  SEARCH_TABS,
  type GlobalSearchResult,
  type RecentSearchItem,
  type SearchResultItem,
  type SearchTab,
} from "../../lib/search";
import { SEARCH_ERRORS, searchUserMessage } from "../../lib/search/errors";
import { buildSearchHref } from "../../lib/search/contracts";
import SearchShell from "./components/SearchShell";

type SearchExperienceProps = {
  initialQuery?: string;
  initialTab?: SearchTab;
  initialViewerId?: string | null;
};

const SUGGEST_DEBOUNCE_MS = 280;
/** Client recovery when the server action never resolves (hung query / network). */
const SEARCH_ACTION_TIMEOUT_MS = 12_000;

function ResultRow({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-sky-400/30 hover:bg-white/[0.06]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-black">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          (item.title.slice(0, 1) || "?").toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-xs text-white/55">{item.subtitle}</p>
        ) : null}
      </div>
      {item.badge ? (
        <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function SearchExperience({
  initialQuery = "",
  initialTab = "all",
  initialViewerId = null,
}: SearchExperienceProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<SearchTab>(initialTab);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const loadRecent = useEffectEvent(async () => {
    const res = await recentSearchesAction();
    if (res.ok) setRecent(res.items);
  });

  useEffect(() => {
    void loadRecent();
  }, []);

  const runSearch = useCallback(
    async (nextQuery: string, nextTab: SearchTab, remember: boolean) => {
      const generation = ++generationRef.current;
      setLoading(true);
      setError(null);

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        const res = await Promise.race([
          globalSearchAction({
            query: nextQuery,
            tab: nextTab,
            remember,
          }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error(SEARCH_ERRORS.loadFailed));
            }, SEARCH_ACTION_TIMEOUT_MS);
          }),
        ]);

        if (generation !== generationRef.current) return;

        if (!res.ok) {
          setResult(null);
          setError(searchUserMessage(res.message, SEARCH_ERRORS.loadFailed));
          setLoading(false);
          return;
        }

        setResult(res.result);
        setLoading(false);
        if (remember) {
          void loadRecent();
        }
      } catch (error) {
        if (generation !== generationRef.current) return;
        setResult(null);
        setError(
          searchUserMessage(
            error instanceof Error ? error.message : null,
            SEARCH_ERRORS.loadFailed
          )
        );
        setLoading(false);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery.trim()) {
      void runSearch(initialQuery, initialTab, true);
    }
  }, [initialQuery, initialTab, runSearch]);

  const scheduleSuggest = (value: string, nextTab: SearchTab) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!value.trim()) {
        setResult(null);
        setError(null);
        setLoading(false);
        return;
      }
      void runSearch(value, nextTab, false);
    }, SUGGEST_DEBOUNCE_MS);
  };

  const commitSearch = (value: string, nextTab: SearchTab = tab) => {
    const trimmed = value.trim();
    router.replace(buildSearchHref({ q: trimmed || undefined, tab: nextTab }), {
      scroll: false,
    });
    if (!trimmed) {
      setResult(null);
      setError(null);
      return;
    }
    startTransition(() => {
      void runSearch(trimmed, nextTab, true);
    });
  };

  const onTabChange = (next: SearchTab) => {
    setTab(next);
    commitSearch(query, next);
  };

  const clearRecent = () => {
    startTransition(async () => {
      const res = await clearRecentSearchesAction();
      if (res.ok) setRecent([]);
    });
  };

  const showRecent =
    !query.trim() && !loading && !result && recent.length > 0;
  const showEmpty =
    Boolean(query.trim()) &&
    !loading &&
    !pending &&
    !error &&
    result &&
    result.items.length === 0;

  return (
    <SearchShell>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          commitSearch(query, tab);
        }}
      >
        <label className="block">
          <span className="sr-only">Search UMTUBA</span>
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-sky-400/40">
            <span className="text-sm font-black text-sky-300/80" aria-hidden>
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                scheduleSuggest(value, tab);
              }}
              placeholder="Search people, videos, stories, stores…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent text-sm font-medium text-white placeholder:text-white/35 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResult(null);
                  setError(null);
                  router.replace(buildSearchHref({ tab }), { scroll: false });
                }}
                className="rounded-full px-2 py-1 text-[11px] font-bold text-white/50 hover:bg-white/10 hover:text-white"
              >
                Clear
              </button>
            ) : null}
          </div>
        </label>

        <div
          className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Search categories"
        >
          {SEARCH_TABS.map((item) => {
            const active = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "border border-sky-400/35 bg-sky-500/15 text-sky-50"
                    : "border border-white/10 bg-white/5 text-white/55 hover:text-white"
                }`}
              >
                {SEARCH_TAB_LABELS[item]}
              </button>
            );
          })}
        </div>
      </form>

      <div className="mt-6 space-y-6">
        {error ? (
          <ProductErrorState
            title="Search unavailable"
            message={error}
            onRetry={() => commitSearch(query, tab)}
          />
        ) : null}

        {(loading || pending) && !result ? (
          <ProductLoadingState label="Searching UMTUBA…" />
        ) : null}

        {showRecent ? (
          <section aria-label="Recent searches">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Recent
              </h2>
              {initialViewerId ? (
                <button
                  type="button"
                  onClick={clearRecent}
                  disabled={pending}
                  className="text-[11px] font-bold text-white/45 hover:text-white"
                >
                  Clear all
                </button>
              ) : null}
            </div>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(item.query);
                      setTab(item.tab);
                      commitSearch(item.query, item.tab);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm font-bold text-white/80 transition hover:bg-white/[0.06]"
                  >
                    <span className="truncate">{item.query}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-white/35">
                      {SEARCH_TAB_LABELS[item.tab]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!query.trim() && !showRecent && !loading ? (
          <ProductEmptyState
            compact
            eyebrow="Search"
            title="Search across UMTUBA"
            description="Find people, ready videos, active stories from people you follow, stores, and products."
            primaryHref={APP_ROUTES.discover}
            primaryLabel="Open Discover"
            secondaryHref={APP_ROUTES.store}
            secondaryLabel="Browse Store"
          />
        ) : null}

        {showEmpty ? (
          <ProductEmptyState
            compact
            eyebrow="No results"
            title={`No matches for “${query.trim()}”`}
            description="Try another spelling, or switch tabs to narrow the search."
            primaryHref={APP_ROUTES.discover}
            primaryLabel="Discover"
            secondaryHref={APP_ROUTES.storeSearch}
            secondaryLabel="Store search"
          />
        ) : null}

        {result && result.items.length > 0 ? (
          tab === "all" ? (
            <div className="space-y-6">
              {result.groups
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <section key={group.tab} aria-label={group.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                        {group.label}
                      </h2>
                      <button
                        type="button"
                        onClick={() => onTabChange(group.tab)}
                        className="text-[11px] font-bold text-sky-300/80 hover:text-sky-200"
                      >
                        See all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {group.items.slice(0, 4).map((item) => (
                        <ResultRow key={`${item.entityType}-${item.id}`} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          ) : (
            <div className="space-y-2">
              {result.items.map((item) => (
                <ResultRow key={`${item.entityType}-${item.id}`} item={item} />
              ))}
            </div>
          )
        ) : null}

        {(loading || pending) && result ? (
          <p className="text-center text-[11px] font-bold text-white/40">
            Updating results…
          </p>
        ) : null}
      </div>
    </SearchShell>
  );
}
