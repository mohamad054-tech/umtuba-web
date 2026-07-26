"use client";

export type ProfileTabId =
  | "all"
  | "posts"
  | "videos"
  | "articles"
  | "about"
  | "live";

type ProfileTabsProps = {
  activeTab: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
  videoCount: number;
  postCount: number;
  articleCount: number;
  liveCount: number;
  showLiveTab: boolean;
};

const BASE_TABS: { id: ProfileTabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "posts", label: "Posts" },
  { id: "videos", label: "Videos" },
  { id: "articles", label: "Articles" },
  { id: "about", label: "About" },
];

export default function ProfileTabs({
  activeTab,
  onChange,
  videoCount,
  postCount,
  articleCount,
  liveCount,
  showLiveTab,
}: ProfileTabsProps) {
  const tabs = showLiveTab
    ? [...BASE_TABS.slice(0, 4), { id: "live" as const, label: "Live" }, BASE_TABS[4]!]
    : BASE_TABS;

  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm"
      onKeyDown={(event) => {
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
        if (currentIndex < 0) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
          if (next) onChange(next.id);
        }
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const count =
          tab.id === "videos"
            ? videoCount
            : tab.id === "posts"
              ? postCount
              : tab.id === "articles"
                ? articleCount
                : tab.id === "live"
                  ? liveCount
                  : null;
        const tabId = `profile-tab-${tab.id}`;
        const panelId = `profile-panel-${tab.id}`;

        return (
          <button
            key={tab.id}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`watch-focus-ring shrink-0 rounded-xl px-3 py-2.5 text-sm font-bold transition sm:flex-1 sm:px-4 ${
              active
                ? "bg-blue-500/20 text-blue-100"
                : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            {tab.label}
            {count !== null ? (
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
