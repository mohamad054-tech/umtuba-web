"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CityHandoffPayload } from "../../../lib/city/handoff";
import { shouldUseRouterBackForCity } from "../../../lib/city/handoff";
import { APP_ROUTES } from "../../../lib/nav";

type CityActionBarProps = {
  handoff: CityHandoffPayload | null;
  fromGlobe: boolean;
  onAskAi: () => void;
};

export default function CityActionBar({
  handoff,
  fromGlobe,
  onAskAi,
}: CityActionBarProps) {
  const router = useRouter();
  const watchHref = handoff?.watchHref ?? null;
  const showContinueWatching = Boolean(handoff?.source.videoId && watchHref);

  function handleBackToGlobe() {
    if (fromGlobe || shouldUseRouterBackForCity(handoff)) {
      router.back();
      return;
    }

    router.push("/post-journey");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={handleBackToGlobe}
        className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white/10"
      >
        Back to Globe
      </button>

      {showContinueWatching && watchHref ? (
        <Link
          href={watchHref}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-bold hover:bg-white/10"
        >
          Continue watching
        </Link>
      ) : null}

      <Link
        href={APP_ROUTES.worldDiscovery}
        className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-3 text-center text-sm font-bold text-cyan-100 hover:bg-cyan-500/15"
      >
        Explore places
      </Link>

      <button
        type="button"
        onClick={onAskAi}
        className="rounded-full bg-white px-5 py-3 text-sm font-black text-black hover:bg-white/90"
      >
        Ask UMTUBA AI
      </button>
    </div>
  );
}
