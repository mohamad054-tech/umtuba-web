"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../components/i18n";
import { localizedLocationCountry } from "../../watch/lib/mapWatchVideo";
import type { DiscoverLocation } from "../types";

type DiscoverLocationBannerProps = {
  location: DiscoverLocation;
};

/**
 * Remount via `key` on the parent when the active video changes so the
 * banner reappears for each location without syncing state in an effect.
 */
export default function DiscoverLocationBanner({
  location,
}: DiscoverLocationBannerProps) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const country = localizedLocationCountry(
    location.country,
    t("discover.worldwide")
  );
  const label = `${location.city}, ${country}`;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHidden(true);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <div
      className="discover-location-banner pointer-events-none absolute inset-x-0 top-5 z-30 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex max-w-[90%] items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_40px_rgba(37,99,235,0.22)] backdrop-blur-xl">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
          aria-hidden
        />
        <span className="truncate">
          {t("discover.nowExploring")}{" "}
          <span className="text-sky-100">{label}</span>
        </span>
      </div>
    </div>
  );
}
