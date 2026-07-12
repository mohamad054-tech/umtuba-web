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

type MotionContextValue = {
  startTransition: <TPayload = unknown>(
    options: StartTransitionOptions<TPayload>
  ) => Promise<MotionTransitionResult>;
  cancel: () => MotionTransitionResult | null;
  complete: () => MotionTransitionResult | null;
  fail: (error?: MotionEngineError) => MotionTransitionResult | null;
  subscribe: (subscriber: MotionSubscriber) => () => void;
  status: MotionEngineStatus;
  active: MotionActiveRun | null;
  registry: MotionRegistry;
  runner: MotionRunner;
  lastEvent: MotionEngineEvent | null;
};

const MotionContext = createContext<MotionContextValue | null>(null);

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

  const value = useMemo<MotionContextValue>(
    () => ({
      startTransition,
      cancel,
      complete,
      fail,
      subscribe,
      status,
      active,
      registry,
      runner,
      lastEvent,
    }),
    [
      startTransition,
      cancel,
      complete,
      fail,
      subscribe,
      status,
      active,
      registry,
      runner,
      lastEvent,
    ]
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionContext);

  if (!context) {
    throw new Error("useMotion must be used within a MotionProvider.");
  }

  return context;
}
