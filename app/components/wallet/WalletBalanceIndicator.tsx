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
import { useEffect, useRef, useState, type ReactNode } from "react";

type WalletBalanceIndicatorProps = {
  /** denser chrome for immersive surfaces like Watch */
  compact?: boolean;
  className?: string;
  tone?: "default" | "gold";
  /** Signed-out chip shows 0 and still opens sign-in. */
  guestShowsZero?: boolean;
  /** Gold +N for a balance increase after the first value this session. */
  celebrateIncrease?: boolean;
};

export default function WalletBalanceIndicator({
  compact = false,
  className = "",
  tone = "default",
  guestShowsZero = false,
  celebrateIncrease = false,
}: WalletBalanceIndicatorProps) {
  const router = useRouter();
  const asset = getPrimaryWalletAsset();
  const { status, balance, errorMessage, refresh } = useWalletBalance();
  const [gain, setGain] = useState<number | null>(null);
  const seenAmount = useRef<number | null>(null);
  const gold = tone === "gold";
  const chipBorder = gold
    ? "border-[#f0a93b]/55 bg-[#f0a93b]/15 text-[#f0a93b] hover:bg-[#f0a93b]/25"
    : "border-violet-400/30 bg-violet-500/15 text-violet-100 hover:border-violet-400/45 hover:bg-violet-500/25";

  useEffect(() => {
    if (!celebrateIncrease || status !== "ready") return;
    const amount = balance?.amount;
    if (typeof amount !== "number") return;
    if (seenAmount.current == null) {
      seenAmount.current = amount;
      return;
    }
    const previous = seenAmount.current;
    seenAmount.current = amount;
    if (amount <= previous) return;
    setGain(amount - previous);
    const timer = window.setTimeout(() => setGain(null), 1500);
    return () => window.clearTimeout(timer);
  }, [balance?.amount, celebrateIncrease, status]);

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
    const guestAmount = formatWalletAmount(0, asset.decimals);
    return (
      <GainWrap gain={gain}>
        <Link
          href={`${APP_ROUTES.login}?next=${encodeURIComponent(asset.href)}`}
          className={`${baseClass} ${
            gold
              ? "border-[#f0a93b]/40 bg-[#f0a93b]/10 text-[#f0a93b]"
              : "border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70"
          } ${className}`}
          aria-label={`Sign in to view ${asset.displayName}`}
          title={asset.displayName}
        >
          <DiamondIcon gold={gold} />
          <span className="truncate tabular-nums">
            {guestShowsZero ? guestAmount : asset.symbol}
          </span>
        </Link>
      </GainWrap>
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
    <GainWrap gain={gain}>
      <button
        type="button"
        onClick={() => router.push(asset.href)}
        className={`${baseClass} ${chipBorder} ${className}`}
        aria-label={`${asset.displayName}: ${exactAmount}. Open rewards.`}
        title={`${asset.displayName}: ${exactAmount}`}
      >
        <DiamondIcon gold={gold} />
        <span className="truncate tabular-nums">{compactAmount}</span>
      </button>
    </GainWrap>
  );
}

function GainWrap({
  gain,
  children,
}: {
  gain: number | null;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      {gain != null && gain > 0 ? (
        <span className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 -translate-x-1/2 rounded-full bg-[#f0a93b] px-1.5 py-0.5 text-[10px] font-black text-[#0c1842]">
          +{gain}
        </span>
      ) : null}
      {children}
    </span>
  );
}

function DiamondIcon({ gold = false }: { gold?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 ${gold ? "text-[#f0a93b]" : "text-violet-200"}`}
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 1.2 14.2 8 8 14.8 1.8 8 8 1.2Z" />
    </svg>
  );
}
