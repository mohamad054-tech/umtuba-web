"use client";

import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { useTranslation } from "../../components/i18n";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type SearchShellProps = {
  children: ReactNode;
};

export default function SearchShell({ children }: SearchShellProps) {
  const { t } = useTranslation();

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-[-8%] top-[20%] h-[22rem] w-[22rem] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <AppTopNav title={t("search.title")} subtitle={t("search.subtitle")} />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
        {children}
      </div>
    </main>
  );
}
