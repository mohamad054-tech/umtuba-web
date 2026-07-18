"use client";

import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";

type ProductErrorStateProps = {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  retryBusy?: boolean;
  compact?: boolean;
};

export default function ProductErrorState({
  title = "Something went wrong",
  message = null,
  onRetry,
  retryLabel = "Try again",
  retryBusy = false,
  compact = false,
}: ProductErrorStateProps) {
  const safeMessage = sanitizeUserFacingMessage(
    message,
    "Couldn't complete that request. Please try again."
  );

  return (
    <div
      className={`w-full max-w-md rounded-[28px] border border-red-400/20 bg-red-400/5 text-center ${
        compact ? "px-5 py-8" : "px-6 py-10"
      }`}
      role="alert"
    >
      <p className="text-xl font-black text-red-200">{title}</p>
      <p className="mt-3 text-sm leading-6 text-white/60">{safeMessage}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retryBusy}
          className="watch-focus-ring mt-6 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/85 transition hover:bg-white/10 disabled:opacity-50"
        >
          {retryBusy ? "Retrying…" : retryLabel}
        </button>
      ) : null}
    </div>
  );
}
