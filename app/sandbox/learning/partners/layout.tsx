import type { ReactNode } from "react";
import {
  LEARNING_PARTNER_SANDBOX_BANNER,
  LEARNING_PARTNER_SANDBOX_SUBTITLE,
} from "../../../../lib/sandbox/learningPartners/copy";

export const metadata = {
  title: "Learning Partner Marketplace (SANDBOX) | UMTUBA",
  robots: { index: false, follow: false },
};

export default function LearningPartnersSandboxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-sky-400/30 bg-sky-500/10 px-4 py-2 text-center">
        <p className="text-[10px] font-black tracking-[0.2em] text-sky-100">
          {LEARNING_PARTNER_SANDBOX_BANNER}
        </p>
        <p className="mt-1 text-xs text-sky-50/80">
          {LEARNING_PARTNER_SANDBOX_SUBTITLE}
        </p>
      </div>
      {children}
    </>
  );
}
