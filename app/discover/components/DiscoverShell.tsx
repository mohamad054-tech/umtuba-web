import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import HomeSocialComposer from "../../components/home/HomeSocialComposer";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import DiscoverShellActions from "./DiscoverShellActions";
import HomeSectionCircles from "./HomeSectionCircles";

type DiscoverShellProps = {
  children: ReactNode;
};

/**
 * Video-First Home chrome. Still used by DiscoverExperience (Home feed).
 * `/discover` redirects here; title stays Home.
 *
 * Circular Arc mounts on the video stage edge (DiscoverExperience), not here —
 * so it stays aligned to the video card rather than a page-left rail.
 */
export default function DiscoverShell({ children }: DiscoverShellProps) {
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
          actions={<DiscoverShellActions />}
        />
        <div className="border-b border-white/5 bg-[#050510]/80 backdrop-blur-md">
          <div className="mx-auto w-full max-w-[1400px]">
            <HomeSectionCircles />
            <HomeSocialComposer />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-0 md:px-6 md:py-5">
        {children}
      </div>
    </main>
  );
}
