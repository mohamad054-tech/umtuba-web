"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

const TABS = [
  { id: "products", label: "Products" },
  { id: "about", label: "About" },
  { id: "videos", label: "Videos" },
  { id: "live", label: "Live" },
  { id: "ratings", label: "Ratings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type StoreProfileTabsProps = {
  products: ReactNode;
  about: ReactNode;
};

export default function StoreProfileTabs({ products, about }: StoreProfileTabsProps) {
  const [active, setActive] = useState<TabId>("products");
  const baseId = useId();

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="Store sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {TABS.map((tab) => {
          const selected = active === tab.id;
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
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-${active}`}
        className="mt-5"
      >
        {active === "products" ? products : null}
        {active === "about" ? about : null}
        {active === "videos" ? (
          <PlaceholderCopy
            title="Store videos"
            body="Shoppable videos for this storefront arrive in a later phase."
          />
        ) : null}
        {active === "live" ? (
          <PlaceholderCopy
            title="Live shopping"
            body="Live sessions from this store will appear here when Live Shopping ships."
          />
        ) : null}
        {active === "ratings" ? (
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
