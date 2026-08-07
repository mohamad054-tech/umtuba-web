"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  EXACT_CONTEXT_RESTORE_EVENT,
  type ExactReturnContext,
} from "../../../lib/world/exactContext";

export type WorldLayerTab = {
  id: string;
  label: string;
  enabled: boolean;
  content: ReactNode;
};

export default function WorldLayerTabs({
  tabs,
  initialTab,
}: {
  tabs: WorldLayerTab[];
  initialTab?: string | null;
}) {
  const enabledTabs = useMemo(() => tabs.filter((tab) => tab.enabled), [tabs]);
  const pathname = usePathname();
  const router = useRouter();
  const firstTab = enabledTabs[0]?.id ?? "";
  const [active, setActive] = useState(() =>
    enabledTabs.some((tab) => tab.id === initialTab) ? initialTab! : firstTab
  );

  useEffect(() => {
    function restore(event: Event) {
      const context = (event as CustomEvent<ExactReturnContext>).detail;
      const tab = context?.selectedTab;
      if (tab && enabledTabs.some((item) => item.id === tab)) setActive(tab);
    }
    window.addEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
    return () => window.removeEventListener(EXACT_CONTEXT_RESTORE_EVENT, restore);
  }, [enabledTabs]);

  const selected =
    enabledTabs.find((tab) => tab.id === active) ?? enabledTabs[0] ?? null;
  if (!selected) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        No profile layers are enabled.
      </p>
    );
  }

  return (
    <section>
      <div
        className="flex gap-2 overflow-x-auto pb-3"
        role="tablist"
        aria-label="Profile layers"
      >
        {enabledTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected.id === tab.id}
            onClick={() => {
              setActive(tab.id);
              const params = new URLSearchParams(window.location.search);
              params.set("tab", tab.id);
              router.replace(`${pathname}?${params.toString()}`, {
                scroll: false,
              });
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              selected.id === tab.id
                ? "bg-white text-black"
                : "border border-white/10 bg-white/5 text-white/65"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-3" role="tabpanel" aria-label={selected.label}>
        {selected.content}
      </div>
    </section>
  );
}
