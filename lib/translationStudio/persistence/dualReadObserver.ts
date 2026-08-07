/**
 * Dual-read V1 observer / status contract (JSON authoritative; DB secondary compare).
 */

import type { ReconciliationMismatchCategory } from "../reconciliation/compareStudioSnapshots";
import type { StudioShadowErrorCategory } from "./shadowObserver";

export type DualReadCompareStatus =
  | "IN_SYNC"
  | "DRIFT_DETECTED"
  | "TRANSIENT_LAG"
  | "REMOTE_READ_FAILED"
  | "REMOTE_READ_UNAVAILABLE"
  | "STALE_DISCARDED";

export type DualReadErrorCategory =
  | StudioShadowErrorCategory
  | "unavailable"
  | "success";

export type DualReadCountSummary = Partial<
  Record<ReconciliationMismatchCategory, number>
>;

export type DualReadObserveEvent =
  | {
      type: "started";
      timestamp: string;
      local_hash: string;
      correlation_id?: string;
    }
  | {
      type: "succeeded";
      timestamp: string;
      local_hash: string;
      compare_status: Extract<
        DualReadCompareStatus,
        "IN_SYNC" | "DRIFT_DETECTED" | "TRANSIENT_LAG"
      >;
      duration_ms: number;
      counts: DualReadCountSummary;
      correlation_id?: string;
    }
  | {
      type: "failed";
      timestamp: string;
      local_hash: string;
      compare_status: "REMOTE_READ_FAILED";
      duration_ms: number;
      category: Exclude<StudioShadowErrorCategory, "success">;
      message: string;
      correlation_id?: string;
    }
  | {
      type: "unavailable";
      timestamp: string;
      local_hash: string;
      compare_status: "REMOTE_READ_UNAVAILABLE";
      correlation_id?: string;
      reason?: string;
    }
  | {
      type: "stale_discarded";
      timestamp: string;
      local_hash: string;
      compare_status: "STALE_DISCARDED";
      duration_ms: number;
      current_hash: string;
      correlation_id?: string;
    };

export type StudioDualReadObserver = {
  onEvent(event: DualReadObserveEvent): void;
};

export const noopStudioDualReadObserver: StudioDualReadObserver = {
  onEvent() {},
};

export function composeStudioDualReadObservers(
  ...observers: Array<StudioDualReadObserver | null | undefined>
): StudioDualReadObserver {
  const list = observers.filter(
    (o): o is StudioDualReadObserver => o != null
  );
  return {
    onEvent(event) {
      for (const obs of list) {
        try {
          obs.onEvent(event);
        } catch {
          // never break dual-read / JSON path
        }
      }
    },
  };
}
