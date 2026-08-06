import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import {
  buildBreadcrumbs,
  listSettingsNavLinks,
} from "../../lib/platform/navigation";

type SettingsShellProps = {
  children: ReactNode;
  actions?: ReactNode;
};

const SETTINGS_NAV = listSettingsNavLinks();
const SETTINGS_CRUMBS = buildBreadcrumbs("/settings");

export default function SettingsShell({
  children,
  actions,
}: SettingsShellProps) {
  return (
    <main
      className={`relative flex min-h-screen flex-col overflow-x-hidden bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <AppTopNav
        title="Settings"
        subtitle="Account & preferences"
        actions={actions}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-3 py-4 md:px-6 md:py-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/45"
        >
          {SETTINGS_CRUMBS.map((crumb, index) => (
            <span key={crumb.pageId} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === SETTINGS_CRUMBS.length - 1 ? (
                <span className="font-bold text-white/70">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.dynamic ? "#" : crumb.href}
                  className="watch-focus-ring rounded hover:text-white"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <nav
          aria-label="Settings"
          className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-3"
        >
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="watch-focus-ring rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}
