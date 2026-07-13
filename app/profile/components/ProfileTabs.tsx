export type ProfileTabId = "videos" | "live" | "about";

type ProfileTabsProps = {
  activeTab: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
  videoCount: number;
  liveCount: number;
};

const TABS: { id: ProfileTabId; label: string }[] = [
  { id: "videos", label: "Videos" },
  { id: "live", label: "Live" },
  { id: "about", label: "About" },
];

export default function ProfileTabs({
  activeTab,
  onChange,
  videoCount,
  liveCount,
}: ProfileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Profile sections"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const count =
          tab.id === "videos"
            ? videoCount
            : tab.id === "live"
              ? liveCount
              : null;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`watch-focus-ring flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition sm:px-4 ${
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
