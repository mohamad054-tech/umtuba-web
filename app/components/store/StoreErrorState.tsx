"use client";

import { useTranslation } from "../i18n";

type StoreErrorStateProps = {
  message: string;
  retryLabel?: string;
};

export default function StoreErrorState({
  message,
  retryLabel,
}: StoreErrorStateProps) {
  const { t } = useTranslation();
  const label = retryLabel ?? t("store.error.retry");
  return (
    <div
      role="alert"
      className="rounded-[var(--sf-radius)] border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-5 py-8"
    >
      <p className="text-sm leading-6 text-[var(--sf-danger)]">{message}</p>
      <button
        type="button"
        className="sf-btn sf-btn-secondary mt-4 text-[var(--sf-ink)]"
        onClick={() => window.location.reload()}
      >
        {label}
      </button>
    </div>
  );
}
