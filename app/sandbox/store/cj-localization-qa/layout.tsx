import type { ReactNode } from "react";
import {
  CJ_LOCALIZATION_QA_BANNER,
  CJ_LOCALIZATION_QA_SUBTITLE,
} from "../../../../lib/sandbox/cjLocalizationQa/copy";

export const metadata = {
  title: "CJ Localization QA (SANDBOX) | UMTUBA",
  robots: { index: false, follow: false },
};

export default function CjLocalizationQaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center">
        <p className="text-[10px] font-black tracking-[0.2em] text-amber-100">
          {CJ_LOCALIZATION_QA_BANNER}
        </p>
        <p className="mt-1 text-xs text-amber-50/80">{CJ_LOCALIZATION_QA_SUBTITLE}</p>
      </div>
      {children}
    </>
  );
}
