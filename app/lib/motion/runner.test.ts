import { describe, expect, it, vi } from "vitest";
import {
  createMotionRegistry,
  createMotionRunner,
  MotionEngineError,
  type MotionEngineEvent,
  type MotionTransitionDefinition,
} from "./index";

const demoTransition: MotionTransitionDefinition = {
  id: "demo-flow",
  phases: [
    { id: "a", durationMs: 100, primitives: [{ type: "fade" }] },
    { id: "b", durationMs: 100, primitives: [{ type: "zoom" }] },
    { id: "c", durationMs: 50, primitives: [] },
  ],
};

type FakeTimer = { id: number; fireAt: number; fn: () => void };

function createHarness(definitions: MotionTransitionDefinition[] = [demoTransition]) {
  const registry = createMotionRegistry(definitions);
  let now = 0;
  let nextTimerId = 1;
  let nextRun = 1;
  let timers: FakeTimer[] = [];

  const runner = createMotionRunner({
    registry,
    now: () => now,
    createRunId: () => `run-${nextRun++}`,
    matchMedia: () => ({ matches: false }),
    setTimeoutFn: (fn, delay) => {
      const id = nextTimerId++;
      timers.push({ id, fireAt: now + delay, fn });
      return id;
    },
    clearTimeoutFn: (id) => {
      timers = timers.filter((timer) => timer.id !== id);
    },
  });

  function flush(ms: number) {
    const target = now + ms;
    while (true) {
      const due = timers
        .filter((timer) => timer.fireAt <= target)
        .sort((a, b) => a.fireAt - b.fireAt);

      if (due.length === 0) {
        now = target;
        break;
      }

      const next = due[0];
      timers = timers.filter((timer) => timer.id !== next.id);
      now = next.fireAt;
      next.fn();
    }
  }

  return { registry, runner, flush, getTimers: () => timers };
}

describe("motion registry", () => {
  it("registers definitions and rejects duplicate ids", () => {
    const registry = createMotionRegistry();
    registry.register(demoTransition);
    expect(registry.has("demo-flow")).toBe(true);
    expect(registry.list()).toHaveLength(1);

    expect(() => registry.register(demoTransition)).toThrowError(MotionEngineError);
    try {
      registry.register(demoTransition);
    } catch (error) {
      expect(error).toBeInstanceOf(MotionEngineError);
      expect((error as MotionEngineError).message).toMatch(/Duplicate transition id/);
    }
  });
});

describe("motion runner", () => {
  it("fails safely on unknown transition ids", async () => {
    const { runner } = createHarness();
    const result = await runner.startTransition({ type: "missing-flow" });

    expect(result.status).toBe("failed");
    expect(result.error?.code).toBe("UNKNOWN_TRANSITION");
    expect(runner.getStatus()).toBe("idle");
  });

  it("runs phases in order and completes", async () => {
    const { runner, flush } = createHarness();
    const phases: string[] = [];

    runner.subscribe((event) => {
      if (event.type === "phase:start") {
        phases.push(event.phaseId);
      }
    });

    const pending = runner.startTransition({ type: "demo-flow", profile: "normal" });
    flush(1000);
    const result = await pending;

    expect(phases).toEqual(["a", "b", "c"]);
    expect(result.status).toBe("completed");
    expect(runner.getActive()).toBeNull();
  });

  it("cancels an in-flight transition idempotently", async () => {
    const { runner, flush } = createHarness();
    const pending = runner.startTransition({ type: "demo-flow" });

    flush(50);
    const first = runner.cancel();
    const second = runner.cancel();

    expect(first?.status).toBe("cancelled");
    expect(second).toBeNull();

    const result = await pending;
    expect(result.status).toBe("cancelled");
  });

  it("completes via fallback timeout when phase timers never fire", async () => {
    const registry = createMotionRegistry([
      {
        id: "stall-safe",
        phases: [
          { id: "only", durationMs: 200, primitives: [] },
        ],
      },
    ]);

    let now = 0;
    let nextTimerId = 1;
    let timers: FakeTimer[] = [];

    const runner = createMotionRunner({
      registry,
      now: () => now,
      createRunId: () => "run-fallback",
      matchMedia: () => ({ matches: false }),
      setTimeoutFn: (fn, delay) => {
        const id = nextTimerId++;
        timers.push({ id, fireAt: now + delay, fn });
        return id;
      },
      clearTimeoutFn: (id) => {
        timers = timers.filter((timer) => timer.id !== id);
      },
    });

    const pending = runner.startTransition({ type: "stall-safe" });

    // Drop phase timers; keep only the longest (fallback) timer.
    const fallback = timers.reduce((max, timer) =>
      timer.fireAt > max.fireAt ? timer : max
    );
    timers = [fallback];
    now = fallback.fireAt;
    fallback.fn();
    timers = [];

    const result = await pending;
    expect(result.status).toBe("completed");
    expect(result.runId).toBe("run-fallback");
  });

  it("rejects concurrent starts by default", async () => {
    const { runner, flush } = createHarness();
    const firstPromise = runner.startTransition({ type: "demo-flow" });
    const second = await runner.startTransition({ type: "demo-flow" });

    expect(second.status).toBe("failed");
    expect(second.error?.code).toBe("CONCURRENT_REJECTED");

    flush(1000);
    await firstPromise;
  });

  it("replace concurrency cancels the previous run then starts a new one", async () => {
    const { runner, flush } = createHarness();
    const events: MotionEngineEvent["type"][] = [];

    runner.subscribe((event) => {
      events.push(event.type);
    });

    const firstPromise = runner.startTransition({ type: "demo-flow" });
    flush(20);

    const secondPromise = runner.startTransition({
      type: "demo-flow",
      concurrency: "replace",
    });

    const firstResult = await firstPromise;
    expect(firstResult.status).toBe("cancelled");

    flush(1000);
    const secondResult = await secondPromise;
    expect(secondResult.status).toBe("completed");
    expect(events).toContain("transition:cancel");
    expect(events).toContain("transition:complete");
  });

  it("ignores stale timers after Strict Mode style cleanup/restart", async () => {
    const { runner, flush } = createHarness();
    const completedRunIds: string[] = [];

    runner.subscribe((event) => {
      if (event.type === "transition:complete") {
        completedRunIds.push(event.runId);
      }
    });

    const first = runner.startTransition({ type: "demo-flow" });
    // Simulate effect cleanup: cancel active run (clears timers).
    runner.cancel();
    await first;

    const second = runner.startTransition({ type: "demo-flow" });
    flush(1000);
    const secondResult = await second;

    expect(secondResult.status).toBe("completed");
    expect(completedRunIds).toEqual([secondResult.runId]);
  });

  it("does not crash when subscribers throw", async () => {
    const { runner, flush } = createHarness();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    runner.subscribe(() => {
      throw new Error("subscriber boom");
    });

    const pending = runner.startTransition({
      type: "demo-flow",
      onComplete: () => {
        throw new Error("onComplete boom");
      },
    });

    flush(1000);
    const result = await pending;

    expect(result.status).toBe("completed");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("strips heavy primitives under reduced profile", async () => {
    const { runner, flush } = createHarness();
    const primitives: string[] = [];

    runner.subscribe((event) => {
      if (event.type === "primitive") {
        primitives.push(event.primitive.type);
      }
    });

    const pending = runner.startTransition({
      type: "demo-flow",
      profile: "reduced",
    });
    flush(1000);
    await pending;

    expect(primitives).toEqual(["fade"]);
    expect(primitives).not.toContain("zoom");
  });
});
