/**
 * Best-effort leave on tab close / refresh.
 * Uses keepalive fetch so the request can outlive the page.
 */
export function signalLiveLeave(roomId: string): void {
  if (typeof window === "undefined") return;
  const trimmed = roomId.trim();
  if (!trimmed) return;

  const body = JSON.stringify({ roomId: trimmed });
  const url = "/api/live/leave";

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) {
        return;
      }
    }
  } catch {
    // fall through to fetch
  }

  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    });
  } catch {
    // Page is unloading — ignore.
  }
}
