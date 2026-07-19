import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../components/AppTopNav";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../lib/nav";

const LINKS = [
  { href: APP_ROUTES.advertiseDashboard, label: "Dashboard" },
  { href: APP_ROUTES.advertiseCampaigns, label: "Campaigns" },
  { href: APP_ROUTES.advertiseCreativesNew, label: "New creative" },
  { href: APP_ROUTES.advertiseSettings, label: "Settings" },
] as const;

type AdvertiseShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showNav?: boolean;
};

export default function AdvertiseShell({
  title,
  subtitle = "UMTUBA Ads",
  children,
  showNav = true,
}: AdvertiseShellProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle} />
        {showNav ? (
          <nav
            aria-label="Advertise"
            className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
