import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";

export const TRANSLATION_STUDIO_BASE = "/admin/translation-studio";

const NAV = [
  { href: TRANSLATION_STUDIO_BASE, label: "Overview" },
  { href: `${TRANSLATION_STUDIO_BASE}/app-shell`, label: "App Shell" },
  { href: `${TRANSLATION_STUDIO_BASE}/learning`, label: "Learning" },
  { href: `${TRANSLATION_STUDIO_BASE}/languages`, label: "Languages" },
  { href: `${TRANSLATION_STUDIO_BASE}/namespaces`, label: "Namespaces" },
  { href: `${TRANSLATION_STUDIO_BASE}/keys`, label: "Keys" },
  { href: `${TRANSLATION_STUDIO_BASE}/review`, label: "Review queue" },
  { href: `${TRANSLATION_STUDIO_BASE}/publish`, label: "Publish queue" },
  { href: `${TRANSLATION_STUDIO_BASE}/terminology`, label: "Terminology" },
  { href: `${TRANSLATION_STUDIO_BASE}/intelligence`, label: "Intelligence" },
] as const;

export default function TranslationStudioShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <AppTopNav
          title={title}
          subtitle={subtitle ?? "Internal Translation Studio"}
        />
        <nav
          aria-label="Translation Studio"
          className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        >
          <Link
            href={APP_ROUTES.adminStore}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Store admin
          </Link>
          <Link
            href="/admin/ai"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            AI platform
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mt-3 text-xs text-amber-200/80">
          Persistent workflow — drafts/reviews are saved; automatic publishing
          remains disabled.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
