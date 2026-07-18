"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatWalletAmount,
  formatWalletAmountExact,
  getPrimaryWalletAsset,
} from "../../../lib/wallet";
import { APP_ROUTES } from "../../lib/nav";
import { useWalletBalance } from "./useWalletBalance";

type WalletBalanceIndicatorProps = {
  /** denser chrome for immersive surfaces like Watch */
  compact?: boolean;
  className?: string;
};

export default function WalletBalanceIndicator({
  compact = false,
  className = "",
}: WalletBalanceIndicatorProps) {
  const router = useRouter();
  const asset = getPrimaryWalletAsset();
  const { status, balance, errorMessage, refresh } = useWalletBalance();

  const baseClass = compact
    ? "watch-focus-ring inline-flex h-8 max-w-[7.5rem] items-center gap-1 rounded-full border px-2 text-[11px] font-bold transition"
    : "watch-focus-ring inline-flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition sm:max-w-none sm:px-3";

  if (status === "loading") {
    return (
      <span
        className={`${baseClass} border-white/10 bg-white/5 text-white/40 ${className}`}
        aria-busy="true"
        aria-label={`Loading ${asset.displayName}`}
        title={asset.displayName}
      >
        <span className="h-3 w-3 animate-pulse rounded-full bg-violet-400/40" />
        <span className="hidden sm:inline">…</span>
        <span className="sm:hidden">UM</span>
      </span>
    );
  }

  if (status === "signed_out") {
    return (
      <Link
        href={`${APP_ROUTES.login}?next=${encodeURIComponent(asset.href)}`}
        className={`${baseClass} border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70 ${className}`}
        aria-label={`Sign in to view ${asset.displayName}`}
        title={asset.displayName}
      >
        <DiamondIcon />
        <span className="truncate">
          <span className="sm:hidden">{asset.symbol}</span>
          <span className="hidden sm:inline">{asset.symbol} —</span>
        </span>
      </Link>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => void refresh()}
        className={`${baseClass} border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/15 ${className}`}
        aria-label={`${asset.displayName} unavailable. Retry.`}
        title={
          errorMessage
            ? // Sanitized upstream in getPrimaryWalletBalanceAction
              errorMessage
            : `Unable to load ${asset.displayName}`
        }
      >
        <DiamondIcon />
        <span className="truncate">Retry</span>
      </button>
    );
  }

  const amount = balance?.amount ?? 0;
  const compactAmount = formatWalletAmount(amount, asset.decimals);
  const exactAmount = formatWalletAmountExact(amount);

  return (
    <button
      type="button"
      onClick={() => router.push(asset.href)}
      className={`${baseClass} border-violet-400/30 bg-violet-500/15 text-violet-100 hover:border-violet-400/45 hover:bg-violet-500/25 ${className}`}
      aria-label={`${asset.displayName}: ${exactAmount}. Open rewards.`}
      title={`${asset.displayName}: ${exactAmount}`}
    >
      <DiamondIcon />
      <span className="truncate tabular-nums">
        <span className="sm:hidden">{compactAmount}</span>
        <span className="hidden sm:inline">
          {compactAmount}{" "}
          <span className="font-semibold text-violet-200/80">{asset.symbol}</span>
        </span>
      </span>
    </button>
  );
}

function DiamondIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0 text-violet-200"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1.2 14.2 8 8 14.8 1.8 8 8 1.2Z" />
    </svg>
  );
}
