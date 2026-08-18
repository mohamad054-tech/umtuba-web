"use client";

import type { ReactNode } from "react";
import AppTopNav from "../components/AppTopNav";
import { useTranslation } from "../components/i18n";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";

type SettingsShellProps = {
  children: ReactNode;
  actions?: ReactNode;
};

export default function SettingsShell({
  children,
  actions,
}: SettingsShellProps) {
  const { t } = useTranslation();

  return (
    <main
      className={`relative flex min-h-screen flex-col bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <AppTopNav
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        actions={actions}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </main>
  );
}
