"use client";

import {
  PROFILE_TAB_LABELS,
  type ProfileTabId,
} from "../lib/profileTabs";
import {
  PROFILE_A11Y_FOCUS_RING_CLASS,
  PROFILE_A11Y_TOUCH_TARGET_CLASS,
} from "../lib/profileAccessibility";
import { CREATOR_SPACE_COPY } from "../lib/profileCreatorSpaceIa";

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

function focusTabButton(tabId: ProfileTabId) {
  const el = document.getElementById(`profile-tab-${tabId}`);
  if (el instanceof HTMLButtonElement) {
    el.focus();
  }
}

/**
 * Profile tablist — arrow / Home / End navigation, aria wiring (§21).
 * Touch targets ≥ 44px. Subtle active transition; respects reduced motion.
 */
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
      aria-label={CREATOR_SPACE_COPY.tablistAriaLabel}
      aria-orientation="horizontal"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[#080816]/80 p-1 backdrop-blur"
      onKeyDown={(event) => {
        const currentIndex = tabs.findIndex((tab) => tab === activeTab);
        if (currentIndex < 0 || tabs.length === 0) return;

        let next: ProfileTabId | undefined;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
        } else if (event.key === "Home") {
          event.preventDefault();
          next = tabs[0];
        } else if (event.key === "End") {
          event.preventDefault();
          next = tabs[tabs.length - 1];
        }

        if (next && next !== activeTab) {
          onChange(next);
          // Focus after React commits the selected tab.
          queueMicrotask(() => focusTabButton(next!));
        } else if (next) {
          focusTabButton(next);
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
            className={`${PROFILE_A11Y_FOCUS_RING_CLASS} ${PROFILE_A11Y_TOUCH_TARGET_CLASS} shrink-0 rounded-xl px-3 py-2.5 text-sm font-bold transition motion-reduce:transition-none sm:flex-1 sm:px-4 ${
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
