import { resolveMotionProfile } from "./profiles";
import type { MotionRegistry } from "./registry";
import { getFallbackTimeoutMs, resolveTimeline } from "./timeline";
import {
  MotionEngineError,
  type MotionActiveRun,
  type MotionEngineEvent,
  type MotionEngineStatus,
  type MotionSubscriber,
  type MotionTransitionResult,
  type StartTransitionOptions,
} from "./types";

export type MotionRunnerOptions = {
  registry: MotionRegistry;
  /** Injectable timers for tests. */
  now?: () => number;
  setTimeoutFn?: (handler: () => void, delay: number) => number;
  clearTimeoutFn?: (id: number) => void;
  createRunId?: () => string;
  matchMedia?: (query: string) => { matches: boolean };
};

type InternalRun = {
  runId: string;
  transitionId: string;
  profile: MotionTransitionResult["profile"];
  payload?: unknown;
  from?: string;
  to?: string;
  phaseIndex: number;
  phaseId: string | null;
  settled: boolean;
  resolve: (result: MotionTransitionResult) => void;
  options: StartTransitionOptions;
  timerIds: number[];
};

function safeCall(label: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error(`[motion] ${label} threw:`, error);
  }
}

function createDefaultRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `motion-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type MotionRunner = {
  startTransition: <TPayload = unknown>(
    options: StartTransitionOptions<TPayload>
  ) => Promise<MotionTransitionResult>;
  cancel: (reason?: string) => MotionTransitionResult | null;
  complete: () => MotionTransitionResult | null;
  fail: (error?: MotionEngineError) => MotionTransitionResult | null;
  subscribe: (subscriber: MotionSubscriber) => () => void;
  getStatus: () => MotionEngineStatus;
  getActive: () => MotionActiveRun | null;
};

export function createMotionRunner(options: MotionRunnerOptions): MotionRunner {
  const registry = options.registry;
  const now = options.now ?? (() => Date.now());
  const setTimeoutFn =
    options.setTimeoutFn ??
    ((handler, delay) =>
      globalThis.setTimeout(handler, delay) as unknown as number);
  const clearTimeoutFn =
    options.clearTimeoutFn ??
    ((id) => {
      globalThis.clearTimeout(id);
    });
  const createRunId = options.createRunId ?? createDefaultRunId;

  let activeRun: InternalRun | null = null;
  let status: MotionEngineStatus = "idle";
  const subscribers = new Set<MotionSubscriber>();

  function emit(event: MotionEngineEvent) {
    subscribers.forEach((subscriber) => {
      safeCall("subscriber", () => subscriber(event));
    });
  }

  function getActive(): MotionActiveRun | null {
    if (!activeRun) {
      return null;
    }

    return {
      runId: activeRun.runId,
      transitionId: activeRun.transitionId,
      profile: activeRun.profile,
      phaseId: activeRun.phaseId,
      phaseIndex: activeRun.phaseIndex,
      payload: activeRun.payload,
      from: activeRun.from,
      to: activeRun.to,
    };
  }

  function clearRunTimers(run: InternalRun) {
    run.timerIds.forEach((id) => {
      clearTimeoutFn(id);
    });
    run.timerIds = [];
  }

  function settle(
    run: InternalRun,
    result: MotionTransitionResult,
    eventType: "transition:complete" | "transition:cancel" | "transition:fail"
  ) {
    if (run.settled) {
      return result;
    }

    // Ignore stale settlements from a superseded run.
    if (!activeRun || activeRun.runId !== run.runId) {
      return result;
    }

    run.settled = true;
    clearRunTimers(run);
    activeRun = null;

    if (result.status === "completed") {
      status = "idle";
      emit({
        type: "transition:complete",
        runId: run.runId,
        transitionId: run.transitionId,
        profile: run.profile,
      });
      if (run.options.onComplete) {
        safeCall("onComplete", run.options.onComplete);
      }
    } else if (result.status === "cancelled") {
      status = "idle";
      emit({
        type: "transition:cancel",
        runId: run.runId,
        transitionId: run.transitionId,
        profile: run.profile,
      });
      if (run.options.onCancel) {
        safeCall("onCancel", run.options.onCancel);
      }
    } else {
      status = "failed";
      emit({
        type: "transition:fail",
        runId: run.runId,
        transitionId: run.transitionId,
        profile: run.profile,
        error:
          result.error ??
          new MotionEngineError(
            "RUNNER_ERROR",
            "Motion transition failed.",
            run.transitionId
          ),
      });
      if (run.options.onFail && result.error) {
        safeCall("onFail", () => run.options.onFail?.(result.error!));
      }
      // Return to idle after reporting failure so the engine can accept new work.
      status = "idle";
    }

    // Silence unused eventType param usage for exhaustiveness documentation
    void eventType;

    run.resolve(result);
    return result;
  }

  function complete() {
    if (!activeRun || activeRun.settled) {
      return null;
    }

    status = "completing";
    return settle(
      activeRun,
      {
        status: "completed",
        runId: activeRun.runId,
        transitionId: activeRun.transitionId,
        profile: activeRun.profile,
      },
      "transition:complete"
    );
  }

  function cancel(reason?: string) {
    if (!activeRun || activeRun.settled) {
      return null;
    }

    if (reason) {
      // Reason is reserved for future telemetry; keep cancel API stable.
      void reason;
    }

    return settle(
      activeRun,
      {
        status: "cancelled",
        runId: activeRun.runId,
        transitionId: activeRun.transitionId,
        profile: activeRun.profile,
      },
      "transition:cancel"
    );
  }

  function fail(error?: MotionEngineError) {
    if (!activeRun || activeRun.settled) {
      return null;
    }

    const engineError =
      error ??
      new MotionEngineError(
        "RUNNER_ERROR",
        "Motion transition failed.",
        activeRun.transitionId
      );

    return settle(
      activeRun,
      {
        status: "failed",
        runId: activeRun.runId,
        transitionId: activeRun.transitionId,
        profile: activeRun.profile,
        error: engineError,
      },
      "transition:fail"
    );
  }

  function schedule(run: InternalRun, delayMs: number, work: () => void) {
    const timerId = setTimeoutFn(() => {
      // Drop callbacks from cancelled / replaced runs.
      if (!activeRun || activeRun.runId !== run.runId || run.settled) {
        return;
      }

      work();
    }, delayMs);

    run.timerIds.push(timerId);
  }

  function runPhases(run: InternalRun, timelinePhases: ReturnType<typeof resolveTimeline>["phases"]) {
    const step = (index: number) => {
      if (!activeRun || activeRun.runId !== run.runId || run.settled) {
        return;
      }

      if (index >= timelinePhases.length) {
        complete();
        return;
      }

      const phase = timelinePhases[index];
      run.phaseIndex = index;
      run.phaseId = phase.id;

      emit({
        type: "phase:start",
        runId: run.runId,
        transitionId: run.transitionId,
        phaseId: phase.id,
        phaseIndex: index,
        durationMs: phase.durationMs,
        primitives: phase.primitives,
      });

      for (const primitive of phase.primitives) {
        emit({
          type: "primitive",
          runId: run.runId,
          transitionId: run.transitionId,
          phaseId: phase.id,
          primitive,
        });
      }

      schedule(run, phase.durationMs, () => {
        if (!activeRun || activeRun.runId !== run.runId || run.settled) {
          return;
        }

        emit({
          type: "phase:end",
          runId: run.runId,
          transitionId: run.transitionId,
          phaseId: phase.id,
          phaseIndex: index,
        });

        step(index + 1);
      });
    };

    step(0);
  }

  async function startTransition<TPayload = unknown>(
    startOptions: StartTransitionOptions<TPayload>
  ): Promise<MotionTransitionResult> {
    const concurrency = startOptions.concurrency ?? "reject";
    const definition = registry.get(startOptions.type);

    if (!definition) {
      const error = new MotionEngineError(
        "UNKNOWN_TRANSITION",
        `Unknown motion transition "${startOptions.type}".`,
        startOptions.type
      );

      if (startOptions.onFail) {
        safeCall("onFail", () => startOptions.onFail?.(error));
      }

      return {
        status: "failed",
        runId: "none",
        transitionId: startOptions.type,
        profile: startOptions.profile ?? "normal",
        error,
      };
    }

    if (activeRun && !activeRun.settled) {
      if (concurrency === "reject") {
        const error = new MotionEngineError(
          "CONCURRENT_REJECTED",
          `Motion transition "${startOptions.type}" rejected because another transition is running.`,
          startOptions.type
        );

        if (startOptions.onFail) {
          safeCall("onFail", () => startOptions.onFail?.(error));
        }

        return {
          status: "failed",
          runId: activeRun.runId,
          transitionId: startOptions.type,
          profile: activeRun.profile,
          error,
        };
      }

      cancel("replaced");
    }

    let timeline;

    try {
      const profile = resolveMotionProfile(startOptions.profile, {
        matchMedia: options.matchMedia,
      });
      timeline = resolveTimeline(definition, profile);
    } catch (error) {
      const engineError =
        error instanceof MotionEngineError
          ? error
          : new MotionEngineError(
              "INVALID_DEFINITION",
              error instanceof Error ? error.message : "Invalid transition definition.",
              startOptions.type
            );

      if (startOptions.onFail) {
        safeCall("onFail", () => startOptions.onFail?.(engineError));
      }

      return {
        status: "failed",
        runId: "none",
        transitionId: startOptions.type,
        profile: startOptions.profile ?? "normal",
        error: engineError,
      };
    }

    const runId = createRunId();

    return new Promise<MotionTransitionResult>((resolve) => {
      const run: InternalRun = {
        runId,
        transitionId: definition.id,
        profile: timeline.profile,
        payload: startOptions.payload,
        from: startOptions.from,
        to: startOptions.to,
        phaseIndex: -1,
        phaseId: null,
        settled: false,
        resolve,
        options: startOptions as StartTransitionOptions,
        timerIds: [],
      };

      activeRun = run;
      status = "running";

      emit({
        type: "transition:start",
        runId,
        transitionId: definition.id,
        profile: timeline.profile,
        payload: startOptions.payload,
        from: startOptions.from,
        to: startOptions.to,
      });

      // Hard fallback so a stalled phase chain still settles.
      schedule(run, getFallbackTimeoutMs(timeline), () => {
        if (!activeRun || activeRun.runId !== run.runId || run.settled) {
          return;
        }

        complete();
      });

      try {
        runPhases(run, timeline.phases);
      } catch (error) {
        const engineError =
          error instanceof MotionEngineError
            ? error
            : new MotionEngineError(
                "RUNNER_ERROR",
                error instanceof Error ? error.message : "Runner crashed.",
                definition.id
              );

        fail(engineError);
      }

      // Touch now() so test clocks can observe start time if desired.
      void now();
    });
  }

  return {
    startTransition,
    cancel,
    complete,
    fail,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    getStatus() {
      return status;
    },
    getActive,
  };
}
