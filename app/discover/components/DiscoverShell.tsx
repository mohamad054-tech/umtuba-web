"use client";

import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { useTranslation } from "../../components/i18n";

type DiscoverShellProps = {
  children: ReactNode;
};

/**
 * Video-first home. Section circles, stories, and the welcome/saved chips
 * live on other surfaces so the video can fill the screen.
 */
export default function DiscoverShell({ children }: DiscoverShellProps) {
  const { t } = useTranslation();

  return (
    <main className="um-home-sky relative flex h-dvh min-h-dvh flex-col overflow-hidden overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-indigo-600/15 blur-3xl" />
      </div>
      <div className="sticky top-0 z-40">
        <AppTopNav title={t("nav.home")} sticky={false} />
      </div>
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </main>
  );
}
