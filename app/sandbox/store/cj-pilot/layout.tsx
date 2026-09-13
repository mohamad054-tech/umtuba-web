import type { ReactNode } from "react";
import { CJ_PILOT_BANNER, CJ_PILOT_SUBTITLE } from "../../../../lib/sandbox/cjPilot/copy";

export const metadata = {
  title: "CJ Store Launch Mix V1 (SANDBOX) | UMTUBA Store",
  robots: { index: false, follow: false },
};

export default function CjPilotSandboxLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center">
        <p className="text-xs font-black tracking-[0.2em] text-amber-100">{CJ_PILOT_BANNER}</p>
        <p className="mt-1 text-sm text-amber-50/80">{CJ_PILOT_SUBTITLE}</p>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}
