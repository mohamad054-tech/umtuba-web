import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES } from "../../lib/nav";

export const PRIVATE_AI_BASE = "/admin/private-ai";

const NAV = [
  { href: PRIVATE_AI_BASE, label: "Overview" },
  { href: `${PRIVATE_AI_BASE}/models`, label: "Private Models" },
  { href: `${PRIVATE_AI_BASE}/capabilities`, label: "Capabilities" },
  { href: `${PRIVATE_AI_BASE}/deployments`, label: "Deployments" },
  { href: `${PRIVATE_AI_BASE}/hardware`, label: "Hardware" },
  { href: `${PRIVATE_AI_BASE}/routing`, label: "Routing" },
  { href: `${PRIVATE_AI_BASE}/lifecycle`, label: "Lifecycle" },
] as const;

export default function PrivateAiShell({
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
          subtitle={subtitle ?? "Private AI Foundation"}
        />
        <nav
          aria-label="Private AI"
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
            href="/admin/ai-data"
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            AI data
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
          Read-only architecture — private AI registry and contracts only. No
          training, fine-tuning, inference, or model weights.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
