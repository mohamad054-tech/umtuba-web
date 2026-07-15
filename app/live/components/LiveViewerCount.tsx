"use client";

import { memo } from "react";
import { formatViewerCount } from "../types";

type LiveViewerCountProps = {
  count: number | null;
  className?: string;
  /** presence = live presence count; pending = still connecting; error = failed */
  source?: "presence" | "pending" | "error";
};

function LiveViewerCountComponent({
  count,
  className = "",
  source = "pending",
}: LiveViewerCountProps) {
  const label =
    source === "error"
      ? "offline"
      : source === "pending"
        ? "connecting"
        : "watching";

  const display =
    count == null ? (source === "error" ? "—" : "…") : formatViewerCount(count);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${
        source === "error"
          ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
          : source === "pending"
            ? "border-white/10 bg-black/45 text-white/70"
            : "border-white/10 bg-black/45 text-white/85"
      } ${className}`}
      aria-live="polite"
      aria-label={
        count == null
          ? source === "error"
            ? "Viewer count unavailable"
            : "Connecting viewer count"
          : `${display} watching`
      }
      title={
        source === "presence"
          ? "Live viewer count"
          : source === "error"
            ? "Viewer presence connection failed"
            : "Connecting viewer count…"
      }
    >
      <span
        aria-hidden
        className={`text-[11px] ${
          source === "error"
            ? "text-amber-300"
            : source === "pending"
              ? "text-white/40"
              : "text-red-300"
        }`}
      >
        ●
      </span>
      <span className="tabular-nums">{display}</span>
      <span className="font-medium text-white/45">{label}</span>
    </span>
  );
}

const LiveViewerCount = memo(LiveViewerCountComponent);
export default LiveViewerCount;
