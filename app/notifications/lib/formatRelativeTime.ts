const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Relative labels: Just now, 5m ago, Yesterday, Mar 3, … */
export function formatRelativeTime(
  iso: string,
  nowMs: number = Date.now()
): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return "";
  }

  const diff = Math.max(0, nowMs - then);

  if (diff < 45_000) {
    return "Just now";
  }
  if (diff < HOUR) {
    const minutes = Math.max(1, Math.round(diff / MINUTE));
    return `${minutes}m ago`;
  }

  const thenDate = new Date(then);
  const nowDate = new Date(nowMs);
  const startOfToday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - DAY;

  // Same calendar day → hours; previous calendar day → Yesterday
  // (even when the absolute gap is still under 24h).
  if (then >= startOfToday) {
    const hours = Math.max(1, Math.round(diff / HOUR));
    return `${hours}h ago`;
  }
  if (then >= startOfYesterday && then < startOfToday) {
    return "Yesterday";
  }

  if (thenDate.getFullYear() === nowDate.getFullYear()) {
    return thenDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return thenDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
