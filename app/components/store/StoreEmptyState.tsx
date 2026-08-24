"use client";

import Link from "next/link";
import { useTranslation } from "../i18n";

type StoreEmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function StoreEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: StoreEmptyStateProps) {
  const { t } = useTranslation();
  const label = actionLabel ?? t("actions.continue");
  return (
    <div
      role="status"
      className="rounded-[var(--sf-radius)] border border-dashed border-[var(--sf-line)] bg-[rgba(106,76,255),0.04)] px-5 py-12 text-center"
    >
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(106,76,255),0.28)] bg-[rgba(106,76,255),0.08)] text-[var(--sf-accent)]"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 7h16M4 7l1.2 12.2A2 2 0 0 0 7.2 21h9.6a2 2 0 0 0 2-1.8L20 7M9 7V5a3 3 0 0 1 6 0v2"
          />
        </svg>
      </div>
      <p className="sf-display text-base font-semibold tracking-tight text-[var(--sf-ink)]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--sf-muted)]">
        {description}
      </p>
      {actionHref ? (
        <Link href={actionHref} className="sf-btn sf-btn-ghost mt-5">
          {label}
        </Link>
      ) : null}
    </div>
  );
}
