import type { ReactNode } from "react";
import { LAB_BANNER, LAB_SUBTITLE } from "../../../lib/sandbox/digitalAsset/copy";

export const metadata = {
  title: "Digital Asset Lab (SANDBOX) | UMTUBA",
  robots: { index: false, follow: false },
};

export default function DigitalAssetSandboxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center">
        <p className="text-xs font-black tracking-[0.2em] text-amber-100">
          {LAB_BANNER}
        </p>
        <p className="mt-1 text-sm text-amber-50/80">{LAB_SUBTITLE}</p>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </main>
  );
}
