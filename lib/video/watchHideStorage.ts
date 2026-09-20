"use client";

import {
  sanitizeWatchHideEntries,
  WATCH_HIDE_STORAGE_KEY,
  type WatchHideEntry,
} from "./watchHidePolicy";

export function readLocalWatchHideEntries(now = Date.now()): WatchHideEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(WATCH_HIDE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return sanitizeWatchHideEntries(JSON.parse(raw), now);
  } catch {
    return [];
  }
}

export function writeLocalWatchHideEntries(entries: WatchHideEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      WATCH_HIDE_STORAGE_KEY,
      JSON.stringify(sanitizeWatchHideEntries(entries))
    );
  } catch {
    // Private mode / quota — guest hide is best-effort.
  }
}

export function rememberLocalWatchHide(postId: number, now = Date.now()): WatchHideEntry[] {
  const next = sanitizeWatchHideEntries(
    [...readLocalWatchHideEntries(now), { postId, watchedAt: now }],
    now
  );
  writeLocalWatchHideEntries(next);
  return next;
}
