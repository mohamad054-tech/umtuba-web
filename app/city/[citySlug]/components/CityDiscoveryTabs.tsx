"use client";

import { useState } from "react";
import CityPlaceholderGrid from "./CityPlaceholderGrid";

const TABS = [
  "Videos",
  "Places",
  "Creators",
  "Live",
  "Events",
  "News",
  "AI Guide",
] as const;

type TabId = (typeof TABS)[number];

type CityDiscoveryTabsProps = {
  cityName: string;
};

export default function CityDiscoveryTabs({ cityName }: CityDiscoveryTabsProps) {
  const [active, setActive] = useState<TabId>("Videos");

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {TABS.map((tab) => {
          const selected = tab === active;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">
          {active} · placeholder
        </p>
        <CityPlaceholderGrid section={active} cityName={cityName} />
      </div>
    </section>
  );
}
