export type MotionProfile = "fast" | "normal" | "cinematic" | "reduced";

export type MotionConcurrency = "reject" | "replace";

export type MotionPrimitiveType =
  | "fade"
  | "zoom"
  | "blur"
  | "shared-element"
  | "portal"
  | "camera"
  | "morph";

export type MotionPrimitiveIntent = {
  type: MotionPrimitiveType;
  /** 0–1 intensity hint for surfaces; feature-agnostic. */
  intensity?: number;
  /** Opaque options bag for future surface adapters. */
  options?: Record<string, unknown>;
};

export type MotionPhaseDefinition = {
  id: string;
  /** Base duration before profile scaling. */
  durationMs: number;
  primitives?: MotionPrimitiveIntent[];
};

export type MotionTransitionDefinition = {
  id: string;
  phases: MotionPhaseDefinition[];
  /** Optional description for docs/debugging. */
  description?: string;
};

export type ResolvedMotionPhase = {
  id: string;
  durationMs: number;
  primitives: MotionPrimitiveIntent[];
};

export type ResolvedMotionTimeline = {
  transitionId: string;
  profile: MotionProfile;
  phases: ResolvedMotionPhase[];
  totalDurationMs: number;
};

export type MotionTransitionResultStatus =
  | "completed"
  | "cancelled"
  | "failed";

export type MotionTransitionResult = {
  status: MotionTransitionResultStatus;
  runId: string;
  transitionId: string;
  profile: MotionProfile;
  error?: MotionEngineError;
};

export type MotionEngineErrorCode =
  | "UNKNOWN_TRANSITION"
  | "CONCURRENT_REJECTED"
  | "INVALID_DEFINITION"
  | "RUNNER_ERROR"
  | "ALREADY_SETTLED";

export class MotionEngineError extends Error {
  readonly code: MotionEngineErrorCode;
  readonly transitionId?: string;

  constructor(
    code: MotionEngineErrorCode,
    message: string,
    transitionId?: string
  ) {
    super(message);
    this.name = "MotionEngineError";
    this.code = code;
    this.transitionId = transitionId;
  }
}

export type StartTransitionOptions<TPayload = unknown> = {
  type: string;
  profile?: MotionProfile;
  payload?: TPayload;
  from?: string;
  to?: string;
  /**
   * Concurrent start policy.
   * - reject (default): ignore/fail if a run is active
   * - replace: cancel the active run, then start this one
   */
  concurrency?: MotionConcurrency;
  onComplete?: () => void;
  onCancel?: () => void;
  onFail?: (error: MotionEngineError) => void;
};

export type MotionEngineEvent =
  | {
      type: "transition:start";
      runId: string;
      transitionId: string;
      profile: MotionProfile;
      payload?: unknown;
      from?: string;
      to?: string;
    }
  | {
      type: "phase:start";
      runId: string;
      transitionId: string;
      phaseId: string;
      phaseIndex: number;
      durationMs: number;
      primitives: MotionPrimitiveIntent[];
    }
  | {
      type: "phase:end";
      runId: string;
      transitionId: string;
      phaseId: string;
      phaseIndex: number;
    }
  | {
      type: "primitive";
      runId: string;
      transitionId: string;
      phaseId: string;
      primitive: MotionPrimitiveIntent;
    }
  | {
      type: "transition:complete";
      runId: string;
      transitionId: string;
      profile: MotionProfile;
    }
  | {
      type: "transition:cancel";
      runId: string;
      transitionId: string;
      profile: MotionProfile;
    }
  | {
      type: "transition:fail";
      runId: string;
      transitionId: string;
      profile: MotionProfile;
      error: MotionEngineError;
    };

export type MotionSubscriber = (event: MotionEngineEvent) => void;

export type MotionEngineStatus =
  | "idle"
  | "running"
  | "completing"
  | "failed";

export type MotionActiveRun = {
  runId: string;
  transitionId: string;
  profile: MotionProfile;
  phaseId: string | null;
  phaseIndex: number;
  payload?: unknown;
  from?: string;
  to?: string;
};
