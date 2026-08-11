import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";

export const KNOWLEDGE_ACQUISITION_BASE = "/admin/knowledge";

const NAV = [
  { href: KNOWLEDGE_ACQUISITION_BASE, label: "Overview" },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/sources`, label: "Sources" },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/datasets`, label: "Datasets" },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/rights`, label: "Rights" },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/quality`, label: "Quality" },
  {
    href: `${KNOWLEDGE_ACQUISITION_BASE}/classification`,
    label: "Classification",
  },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/eligibility`, label: "Eligibility" },
  { href: `${KNOWLEDGE_ACQUISITION_BASE}/history`, label: "History" },
] as const;

/**
 * Knowledge Acquisition admin chrome — AppTopNav stays full-bleed.
 */
export default function KnowledgeAcquisitionShell({
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
      <AppTopNav
        title={title}
        subtitle={subtitle ?? "Knowledge Acquisition Platform"}
        sticky
      />
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <nav
          aria-label="Knowledge Acquisition"
          className="flex flex-wrap gap-2 border-b border-white/10 pb-4"
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
          <Link
            href="/admin/translation-studio"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Translation Studio
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
          Read-only foundation — governance registry only. No model training,
          scraping, or external dataset download.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
