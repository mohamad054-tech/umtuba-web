import { SEARCH_TABS, type SearchTab } from "./types";

/** Stable contracts for UI tabs and future Live/Hashtags/Places expansion. */
export const SEARCH_TAB_LABELS: Record<SearchTab, string> = {
  all: "All",
  people: "People",
  videos: "Videos",
  stories: "Stories",
  stores: "Stores",
  products: "Products",
};

export const SEARCH_V1_ACTIVE_ENTITIES = [
  "people",
  "videos",
  "stories",
  "stores",
  "products",
] as const;

export const SEARCH_V1_RESERVED_ENTITIES = [
  "live",
  "hashtags",
  "places",
] as const;

export function isSearchTab(value: string): value is SearchTab {
  return (SEARCH_TABS as readonly string[]).includes(value);
}

export function buildSearchHref(input?: {
  q?: string;
  tab?: SearchTab;
}): string {
  const params = new URLSearchParams();
  if (input?.q?.trim()) params.set("q", input.q.trim());
  if (input?.tab && input.tab !== "all") params.set("tab", input.tab);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
