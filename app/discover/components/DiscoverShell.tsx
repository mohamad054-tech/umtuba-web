import type { ReactNode } from "react";
import Link from "next/link";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";

type DiscoverShellProps = {
  children: ReactNode;
};

export default function DiscoverShell({ children }: DiscoverShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-sky-500/12 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute right-[18%] bottom-[8%] h-[18rem] w-[18rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="sticky top-0 z-40">
        <AppTopNav
          title="Discover"
          badge={
            <span className="hidden rounded-full border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100 sm:inline-flex">
              Feed V1
            </span>
          }
          subtitle="Vertical short-video discovery"
          actions={
            <div className="flex items-center gap-2">
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
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-0 md:px-6 md:py-5">
        {children}
      </div>
    </main>
  );
}
