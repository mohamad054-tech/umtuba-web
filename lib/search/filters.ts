import type { SearchEntityType, SearchResultItem, SearchTab } from "./types";

const TAB_TO_ENTITY: Record<Exclude<SearchTab, "all">, SearchEntityType> = {
  people: "person",
  videos: "video",
  stories: "story",
  stores: "store",
  products: "product",
};

export function entityTypeForTab(
  tab: Exclude<SearchTab, "all">
): SearchEntityType {
  return TAB_TO_ENTITY[tab];
}

export function filterResultsByTab(
  items: SearchResultItem[],
  tab: SearchTab
): SearchResultItem[] {
  if (tab === "all") return items;
  const entity = entityTypeForTab(tab);
  return items.filter((item) => item.entityType === entity);
}

export function groupResultsByTab(items: SearchResultItem[]): {
  tab: Exclude<SearchTab, "all">;
  label: string;
  items: SearchResultItem[];
}[] {
  const labels: Record<Exclude<SearchTab, "all">, string> = {
    people: "People",
    videos: "Videos",
    stories: "Stories",
    stores: "Stores",
    products: "Products",
  };

  return (Object.keys(labels) as Array<Exclude<SearchTab, "all">>).map(
    (tab) => ({
      tab,
      label: labels[tab],
      items: filterResultsByTab(items, tab),
    })
  );
}

/** Permission-oriented filters applied before ranking (defense in depth). */
export function isSearchableVideoRow(row: {
  post_type?: string | null;
  media_status?: string | null;
  video_path?: string | null;
}): boolean {
  return (
    row.post_type === "video" &&
    row.media_status === "ready" &&
    typeof row.video_path === "string" &&
    row.video_path.trim().length > 0
  );
}

export function isSearchableStoreRow(row: { status?: string | null }): boolean {
  return row.status === "active";
}

export function isSearchableProductRow(row: {
  status?: string | null;
  moderation_status?: string | null;
  store_status?: string | null;
}): boolean {
  return (
    row.status === "active" &&
    row.moderation_status === "approved" &&
    row.store_status === "active"
  );
}

export function isSearchableStoryRow(
  row: { expires_at?: string | null },
  now = Date.now()
): boolean {
  if (!row.expires_at) return false;
  const exp = Date.parse(row.expires_at);
  return Number.isFinite(exp) && exp > now;
}
