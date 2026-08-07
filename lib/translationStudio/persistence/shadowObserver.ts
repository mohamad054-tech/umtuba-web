/**
 * Shadow dual-write observability — injectable, no secrets.
 */

export type StudioShadowErrorCategory =
  | "success"
  | "auth"
  | "transport"
  | "rpc"
  | "timeout"
  | "invalid_response"
  | "unavailable";

export type StudioShadowEntityCounts = {
  languages: number;
  namespaces: number;
  keys: number;
  suggestions: number;
  values: number;
  versions: number;
  memory: number;
  terminology: number;
  auditLog: number;
};

export type StudioShadowObserveEvent =
  | {
      type: "queued";
      save_seq: number;
      entity_counts: StudioShadowEntityCounts;
    }
  | {
      type: "superseded";
      save_seq: number;
      superseded_by: number;
    }
  | {
      type: "skipped";
      save_seq: number;
      reason: "no_request_transport";
      category: "unavailable";
    }
  | {
      type: "started";
      save_seq: number;
      attempt: number;
      entity_counts: StudioShadowEntityCounts;
    }
  | {
      type: "retry";
      save_seq: number;
      attempt: number;
      category: StudioShadowErrorCategory;
      message: string;
    }
  | {
      type: "succeeded";
      save_seq: number;
      attempt: number;
      duration_ms: number;
      inserted: number;
      updated: number;
      skipped: number;
    }
  | {
      type: "failed";
      save_seq: number;
      attempt: number;
      duration_ms: number;
      category: StudioShadowErrorCategory;
      message: string;
    };

export type StudioShadowObserver = {
  onEvent(event: StudioShadowObserveEvent): void;
};

export const noopStudioShadowObserver: StudioShadowObserver = {
  onEvent() {
    // intentional no-op
  },
};

/** Safe default: structured console line without secrets. */
export const consoleStudioShadowObserver: StudioShadowObserver = {
  onEvent(event) {
    try {
      console.info("[translation-studio-shadow]", JSON.stringify(event));
    } catch {
      // never throw from observer
    }
  },
};

export function countStudioShadowEntities(state: {
  languages: unknown[];
  namespaces: unknown[];
  keys: unknown[];
  suggestions: unknown[];
  values: unknown[];
  versions: unknown[];
  memory: unknown[];
  terminology: unknown[];
  auditLog: unknown[];
}): StudioShadowEntityCounts {
  return {
    languages: state.languages.length,
    namespaces: state.namespaces.length,
    keys: state.keys.length,
    suggestions: state.suggestions.length,
    values: state.values.length,
    versions: state.versions.length,
    memory: state.memory.length,
    terminology: state.terminology.length,
    auditLog: state.auditLog.length,
  };
}
