import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type LiveShellProps = {
  children: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  /**
   * Live rooms hide the mobile bottom nav (cinematic + chat composer).
   * Lobby keeps default padding for the bottom bar.
   */
  immersive?: boolean;
};

export default function LiveShell({
  children,
  subtitle = "Global live rooms · chat · host controls",
  actions,
  immersive = false,
}: LiveShellProps) {
  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-x-hidden bg-[#050510] text-white ${
        immersive ? "" : MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-red-500/12 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute right-[20%] bottom-[10%] h-[18rem] w-[18rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="sticky top-0 z-50 overflow-visible">
        <AppTopNav
          title="Live"
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              On air
            </span>
          }
          subtitle={subtitle}
          actions={actions}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 py-3 md:px-6 md:py-5">
        {children}
      </div>
    </main>
  );
}
