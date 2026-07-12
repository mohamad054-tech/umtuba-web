"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createMotionRegistry,
  createMotionRunner,
  type MotionActiveRun,
  type MotionEngineError,
  type MotionEngineEvent,
  type MotionEngineStatus,
  type MotionRegistry,
  type MotionRunner,
  type MotionSubscriber,
  type MotionTransitionResult,
  type StartTransitionOptions,
} from "../../lib/motion";
import { registerDefaultMotionTransitions } from "../../motion/transitions";

type MotionApiValue = {
  startTransition: <TPayload = unknown>(
    options: StartTransitionOptions<TPayload>
  ) => Promise<MotionTransitionResult>;
  cancel: () => MotionTransitionResult | null;
  complete: () => MotionTransitionResult | null;
  fail: (error?: MotionEngineError) => MotionTransitionResult | null;
  subscribe: (subscriber: MotionSubscriber) => () => void;
  registry: MotionRegistry;
  runner: MotionRunner;
};

type MotionStateValue = {
  status: MotionEngineStatus;
  active: MotionActiveRun | null;
  lastEvent: MotionEngineEvent | null;
};

type MotionContextValue = MotionApiValue & MotionStateValue;

const MotionApiContext = createContext<MotionApiValue | null>(null);
const MotionStateContext = createContext<MotionStateValue | null>(null);

type MotionProviderProps = {
  children: ReactNode;
  registry?: MotionRegistry;
  registerDefaults?: boolean;
};

function createProviderEngine(
  registryProp: MotionRegistry | undefined,
  registerDefaults: boolean
) {
  const registry = registryProp ?? createMotionRegistry();

  if (registerDefaults && registry.size() === 0) {
    registerDefaultMotionTransitions(registry);
  }

  const runner = createMotionRunner({ registry });

  return { registry, runner };
}

export function MotionProvider({
  children,
  registry: registryProp,
  registerDefaults = true,
}: MotionProviderProps) {
  const [{ registry, runner }] = useState(() =>
    createProviderEngine(registryProp, registerDefaults)
  );

  const [status, setStatus] = useState<MotionEngineStatus>(() =>
    runner.getStatus()
  );
  const [active, setActive] = useState<MotionActiveRun | null>(() =>
    runner.getActive()
  );
  const [lastEvent, setLastEvent] = useState<MotionEngineEvent | null>(null);

  useEffect(() => {
    return runner.subscribe((event) => {
      setLastEvent(event);
      setStatus(runner.getStatus());
      setActive(runner.getActive());
    });
  }, [runner]);

  const sync = useCallback(() => {
    setStatus(runner.getStatus());
    setActive(runner.getActive());
  }, [runner]);

  const startTransition = useCallback(
    <TPayload,>(options: StartTransitionOptions<TPayload>) => {
      return runner.startTransition(options).finally(sync);
    },
    [runner, sync]
  );

  const cancel = useCallback(() => {
    const result = runner.cancel();
    sync();
    return result;
  }, [runner, sync]);

  const complete = useCallback(() => {
    const result = runner.complete();
    sync();
    return result;
  }, [runner, sync]);

  const fail = useCallback(
    (error?: MotionEngineError) => {
      const result = runner.fail(error);
      sync();
      return result;
    },
    [runner, sync]
  );

  const subscribe = useCallback(
    (subscriber: MotionSubscriber) => runner.subscribe(subscriber),
    [runner]
  );

  // Stable — must NOT depend on status/active/lastEvent or Canvas hosts re-render
  // on every motion phase and can lose the WebGL context.
  const api = useMemo<MotionApiValue>(
    () => ({
      startTransition,
      cancel,
      complete,
      fail,
      subscribe,
      registry,
      runner,
    }),
    [
      startTransition,
      cancel,
      complete,
      fail,
      subscribe,
      registry,
      runner,
    ]
  );

  const state = useMemo<MotionStateValue>(
    () => ({
      status,
      active,
      lastEvent,
    }),
    [status, active, lastEvent]
  );

  return (
    <MotionApiContext.Provider value={api}>
      <MotionStateContext.Provider value={state}>
        {children}
      </MotionStateContext.Provider>
    </MotionApiContext.Provider>
  );
}

/** Stable motion API — safe for R3F / Canvas hosts. */
export function useMotionApi() {
  const api = useContext(MotionApiContext);

  if (!api) {
    throw new Error("useMotionApi must be used within a MotionProvider.");
  }

  return api;
}

/** Reactive motion status — for overlays/debug only. */
export function useMotionState() {
  const state = useContext(MotionStateContext);

  if (!state) {
    throw new Error("useMotionState must be used within a MotionProvider.");
  }

  return state;
}

/** Combined hook — re-renders on status changes. Prefer useMotionApi in Canvas hosts. */
export function useMotion(): MotionContextValue {
  const api = useMotionApi();
  const state = useMotionState();

  return {
    ...api,
    ...state,
  };
}
