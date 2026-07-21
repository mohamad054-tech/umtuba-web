"use client";

import { usePathname } from "next/navigation";
import {
  buildExternalDirectionsUrl,
  type DirectionsDestination,
} from "../../../lib/world/directions";
import {
  createExactReturnContext,
  markExternalNavigationPending,
  readExactReturnContext,
  saveExactReturnContext,
} from "../../../lib/world/exactContext";

type Props = {
  destination: DirectionsDestination;
  enabled: boolean;
  label?: string;
  selectedTab?: string | null;
  selectedFilters?: Record<string, string>;
  modalState?: string | null;
  video?: { videoId: string; playbackTimeSeconds: number } | null;
  openPlaceId?: string | null;
  openCityId?: string | null;
  currentJourneyId?: string | null;
  currentSearch?: string | null;
};

export default function ExternalDirectionsLink({
  destination,
  enabled,
  label = "Directions",
  selectedTab,
  selectedFilters,
  modalState,
  video,
  openPlaceId,
  openCityId,
  currentJourneyId,
  currentSearch,
}: Props) {
  const pathname = usePathname();
  const href = enabled ? buildExternalDirectionsUrl(destination) : null;

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      onClick={() => {
        const prior = readExactReturnContext();
        const context = createExactReturnContext({
          internalPath: pathname,
          routeParams: new URLSearchParams(window.location.search),
          scrollY: window.scrollY,
          selectedTab:
            selectedTab ??
            new URLSearchParams(window.location.search).get("tab"),
          selectedFilters,
          modalState: modalState ?? "depart:external-directions",
          video: video ?? prior?.video ?? null,
          openPlaceId: openPlaceId ?? prior?.openPlaceId ?? null,
          openCityId: openCityId ?? prior?.openCityId ?? null,
          currentJourneyId:
            currentJourneyId ?? prior?.currentJourneyId ?? null,
          currentSearch: currentSearch ?? prior?.currentSearch ?? null,
        });
        if (context && saveExactReturnContext(context)) {
          markExternalNavigationPending();
        }
      }}
      className="watch-focus-ring inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-white/90"
    >
      {label}
      <span className="sr-only"> (opens Google Maps externally)</span>
    </a>
  );
}
