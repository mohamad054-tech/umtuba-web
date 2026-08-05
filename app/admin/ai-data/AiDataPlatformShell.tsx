import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";

export const AI_DATA_PLATFORM_BASE = "/admin/ai-data";

const NAV = [
  { href: AI_DATA_PLATFORM_BASE, label: "Overview" },
  { href: `${AI_DATA_PLATFORM_BASE}/datasets`, label: "Datasets" },
  { href: `${AI_DATA_PLATFORM_BASE}/versions`, label: "Versions" },
  { href: `${AI_DATA_PLATFORM_BASE}/experiments`, label: "Experiments" },
  { href: `${AI_DATA_PLATFORM_BASE}/models`, label: "Models" },
  { href: `${AI_DATA_PLATFORM_BASE}/evaluation-sets`, label: "Evaluation Sets" },
  { href: `${AI_DATA_PLATFORM_BASE}/promotion`, label: "Promotion Queue" },
] as const;

export default function AiDataPlatformShell({
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
          subtitle={subtitle ?? "AI Data Platform"}
        />
        <nav
          aria-label="AI Data Platform"
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
          <Link
            href="/admin/knowledge"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Knowledge
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
          Read-only foundation — registries and promotion gates only. No
          training, fine-tuning, or inference changes.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
