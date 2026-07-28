"use client";

import {
  PROFILE_TAB_LABELS,
  type ProfileTabId,
} from "../lib/profileTabs";

export type { ProfileTabId };

type ProfileTabsProps = {
  activeTab: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
  tabs: ProfileTabId[];
  videoCount: number;
  articleCount: number;
  liveCount: number;
  courseCount?: number;
  productCount?: number;
  photoCount?: number;
};

export default function ProfileTabs({
  activeTab,
  onChange,
  tabs,
  videoCount,
  articleCount,
  liveCount,
  courseCount = 0,
  productCount = 0,
  photoCount = 0,
}: ProfileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="sticky top-0 z-20 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#080816]/80 p-1 backdrop-blur"
      onKeyDown={(event) => {
        const currentIndex = tabs.findIndex((tab) => tab === activeTab);
        if (currentIndex < 0) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
          if (next) onChange(next);
        }
      }}
    >
      {tabs.map((tabId) => {
        const active = activeTab === tabId;
        const count =
          tabId === "videos"
            ? videoCount
            : tabId === "articles"
              ? articleCount
              : tabId === "live"
                ? liveCount
                : tabId === "courses"
                  ? courseCount
                  : tabId === "products"
                    ? productCount
                    : tabId === "photos"
                      ? photoCount
                      : null;
        const showCount =
          count !== null &&
          (tabId === "videos" ||
            tabId === "articles" ||
            tabId === "live" ||
            count > 0);
        const panelId = `profile-panel-${tabId}`;
        const buttonId = `profile-tab-${tabId}`;

        return (
          <button
            key={tabId}
            id={buttonId}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tabId)}
            className={`watch-focus-ring shrink-0 rounded-xl px-3 py-2.5 text-sm font-bold transition sm:flex-1 sm:px-4 ${
              active
                ? "bg-blue-500/20 text-blue-100"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            {PROFILE_TAB_LABELS[tabId]}
            {showCount ? (
              <span className="ml-1.5 text-xs font-medium opacity-70">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
