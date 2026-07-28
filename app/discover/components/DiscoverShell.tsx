import type { ReactNode } from "react";
import Link from "next/link";
import AppTopNav from "../../components/AppTopNav";
import { HomeCircularArc } from "../../components/home/circularArc";
import { shouldMountHomeCircularArc } from "../../components/home/circularArc/homeCircularArcFlags";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import HomeSectionCircles from "./HomeSectionCircles";

type DiscoverShellProps = {
  children: ReactNode;
};

/**
 * Video-First Home chrome. Still used by DiscoverExperience (Home feed).
 * `/discover` redirects here; title stays Home.
 *
 * Circular Arc mounts only via `shouldMountHomeCircularArc()`:
 * - Product unlock flag stays fail-closed
 * - Preview may mount in development / explicit non-production preview env
 * Production keeps `HomeSectionCircles` (never removed). Arc is additive overlay when previewing.
 */
export default function DiscoverShell({ children }: DiscoverShellProps) {
  const showCircularArcPreview = shouldMountHomeCircularArc();

  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-x-hidden bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute right-[18%] bottom-[8%] h-[18rem] w-[18rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="sticky top-0 z-40">
        <AppTopNav
          title="Home"
          sticky={false}
          subtitle="Video-first feed"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={APP_ROUTES.welcome}
                className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 sm:inline-flex"
              >
                Welcome
              </Link>
              <Link
                href={APP_ROUTES.saved}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
              >
                Saved
              </Link>
              <Link
                href={APP_ROUTES.createVideo}
                className="watch-focus-ring rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-black text-black transition hover:bg-white/90"
              >
                Upload
              </Link>
            </div>
          }
        />
        <div className="border-b border-white/5 bg-[#050510]/80 backdrop-blur-md">
          <div className="mx-auto w-full max-w-[1400px]">
            <HomeSectionCircles />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-0 md:px-6 md:py-5">
        {children}
        {showCircularArcPreview ? (
          // Left rail host: keeps Arc outside the centered video stage (layout only).
          <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-[4.75rem] sm:w-[5.75rem] md:left-2 md:w-[6.75rem] lg:w-[7.5rem]">
            <HomeCircularArc />
          </div>
        ) : null}
      </div>
    </main>
  );
}
