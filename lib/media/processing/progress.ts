/**
 * Progress state machine — shared across processors.
 */

import {
  MEDIA_PROGRESS_STATES,
  type MediaProgressState,
} from "./types";

const ALLOWED: Record<MediaProgressState, ReadonlySet<MediaProgressState>> = {
  pending: new Set(["claimed", "failed"]),
  claimed: new Set(["processing", "failed", "ready"]),
  processing: new Set(["uploading", "finalizing", "ready", "failed"]),
  uploading: new Set(["finalizing", "ready", "failed"]),
  finalizing: new Set(["ready", "failed"]),
  ready: new Set(),
  failed: new Set(["pending"]), // retry requeue only
};

export function isMediaProgressState(
  value: string
): value is MediaProgressState {
  return (MEDIA_PROGRESS_STATES as readonly string[]).includes(value);
}

export function canTransitionProgress(
  from: MediaProgressState,
  to: MediaProgressState
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.has(to) ?? false;
}

export function assertProgressTransition(
  from: MediaProgressState,
  to: MediaProgressState
): { ok: true } | { ok: false; message: string } {
  if (!canTransitionProgress(from, to)) {
    return {
      ok: false,
      message: `Invalid progress transition: ${from} → ${to}`,
    };
  }
  return { ok: true };
}
