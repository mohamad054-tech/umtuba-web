import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../../components/AppTopNav";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../lib/nav";

type Props = {
  title: string;
  subtitle: string;
  hubLabel: string;
  children: ReactNode;
};

export default function ModerationShell({
  title,
  subtitle,
  hubLabel,
  children,
}: Props) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={title} subtitle={subtitle} sticky />
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <nav
          aria-label={title}
          className="flex flex-wrap gap-2 border-b border-white/10 pb-4"
        >
          <Link
            href={APP_ROUTES.admin}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            {hubLabel}
          </Link>
          <Link
            href={APP_ROUTES.adminModeration}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            {title}
          </Link>
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function StatusChip({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone =
    status === "open" || status === "reviewing"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
      : status === "resolved"
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
        : status === "dismissed"
          ? "border-white/15 bg-white/[0.04] text-white/70"
          : "border-white/15 bg-white/[0.04] text-white/70";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export function FlashMessages({
  error,
  ok,
}: {
  error?: string;
  ok?: string;
}) {
  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </p>
      ) : null}
      {ok ? (
        <p
          role="status"
          className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {ok}
        </p>
      ) : null}
    </>
  );
}
