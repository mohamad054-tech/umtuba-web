"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STOREFRONT_FLAGS } from "../../../lib/store/storefrontFlags";

const BASE_TABS = [
  { id: "products", label: "Products" },
  { id: "about", label: "About" },
] as const;

const OPTIONAL_TABS = [
  {
    id: "videos",
    label: "Videos",
    enabled: STOREFRONT_FLAGS.SHOW_STORE_PROFILE_VIDEOS_TAB,
  },
  {
    id: "live",
    label: "Live",
    enabled: STOREFRONT_FLAGS.SHOW_STORE_PROFILE_LIVE_TAB,
  },
  {
    id: "ratings",
    label: "Ratings",
    enabled: STOREFRONT_FLAGS.SHOW_STORE_PROFILE_RATINGS_TAB,
  },
] as const;

type TabId = (typeof BASE_TABS)[number]["id"] | (typeof OPTIONAL_TABS)[number]["id"];

type StoreProfileTabsProps = {
  products: ReactNode;
  about: ReactNode;
};

export default function StoreProfileTabs({ products, about }: StoreProfileTabsProps) {
  const tabs = useMemo(
    () => [
      ...BASE_TABS,
      ...OPTIONAL_TABS.filter((tab) => tab.enabled).map(({ id, label }) => ({
        id,
        label,
      })),
    ],
    []
  );
  const [active, setActive] = useState<TabId>("products");
  const baseId = useId();
  const activeTab = tabs.some((tab) => tab.id === active) ? active : "products";

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Store sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={`watch-focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "bg-violet-500 text-white"
                  : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeTab}`}
        aria-labelledby={`${baseId}-${activeTab}`}
        className="mt-5"
      >
        {activeTab === "products" ? products : null}
        {activeTab === "about" ? about : null}
        {activeTab === "videos" ? (
          <PlaceholderCopy
            title="Store videos"
            body="Shoppable videos for this storefront arrive in a later phase."
          />
        ) : null}
        {activeTab === "live" ? (
          <PlaceholderCopy
            title="Live shopping"
            body="Live sessions from this store will appear here when Live Shopping ships."
          />
        ) : null}
        {activeTab === "ratings" ? (
          <PlaceholderCopy
            title="Ratings"
            body="Store ratings and reviews are placeholders until the ratings system launches."
          />
        ) : null}
      </div>
    </div>
  );
}

function PlaceholderCopy({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-violet-400/20 bg-violet-500/[0.05] px-5 py-12 text-center">
      <p className="text-base font-black">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/45">{body}</p>
    </div>
  );
}
