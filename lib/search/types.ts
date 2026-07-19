export const SEARCH_TABS = [
  "all",
  "people",
  "videos",
  "stories",
  "stores",
  "products",
] as const;

export type SearchTab = (typeof SEARCH_TABS)[number];

export type SearchEntityType =
  | "person"
  | "video"
  | "story"
  | "store"
  | "product";

export type SearchResultItem = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  badge: string | null;
  /** 0–100 composite score used for ranking within/across groups. */
  score: number;
  matchScore: number;
  activityScore: number;
  qualityScore: number;
};

export type SearchResultGroup = {
  tab: Exclude<SearchTab, "all">;
  label: string;
  items: SearchResultItem[];
};

export type GlobalSearchResult = {
  query: string;
  tab: SearchTab;
  groups: SearchResultGroup[];
  /** Flat ranked list for the active tab (All = mixed). */
  items: SearchResultItem[];
  totalCount: number;
};

export type RecentSearchItem = {
  id: string;
  query: string;
  tab: SearchTab;
  lastSearchedAt: string;
};

export type RankableCandidate = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  badge: string | null;
  /** Fields used for match scoring. */
  matchFields: string[];
  /** ISO timestamp for recency / activity. */
  activityAt: string | null;
  /** 0–1 quality prior (verified store, ready media, etc.). */
  qualityPrior: number;
};
