"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LIVING_CITIES } from "./livingEarthData";
import {
  ACTIVITY_PULSE_MS,
  pickRandomActivityLabel,
  randomActivityIntervalMs,
} from "./globalPulseData";

export type GlobalPulseEvent = {
  id: string;
  cityName: string;
  label: string;
  startedAt: number;
};

type GlobalPulseValue = {
  activeEvent: GlobalPulseEvent | null;
  /** 0–1 intensity for a city based on recent activation. Safe in useFrame. */
  getCityIntensity: (cityName: string) => number;
  isCityActive: (cityName: string) => boolean;
};

const GlobalPulseContext = createContext<GlobalPulseValue | null>(null);

function intensityFromAge(ageMs: number) {
  if (ageMs < 0 || ageMs > ACTIVITY_PULSE_MS) return 0;
  const t = ageMs / ACTIVITY_PULSE_MS;
  if (t < 0.18) return t / 0.18;
  return 1 - (t - 0.18) / 0.82;
}

type GlobalPulseProviderProps = {
  children: ReactNode;
  reducedMotion: boolean;
};

export function GlobalPulseProvider({
  children,
  reducedMotion,
}: GlobalPulseProviderProps) {
  const [activeEvent, setActiveEvent] = useState<GlobalPulseEvent | null>(null);
  const activeEventRef = useRef<GlobalPulseEvent | null>(null);
  const lastCityRef = useRef<string | null>(null);
  const lastLabelRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    activeEventRef.current = activeEvent;
  }, [activeEvent]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let clearId = 0;

    const scheduleNext = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;

        const candidates = LIVING_CITIES.filter(
          (city) => city.name !== lastCityRef.current
        );
        const pool = candidates.length > 0 ? candidates : LIVING_CITIES;
        const city = pool[Math.floor(Math.random() * pool.length)];
        const label = pickRandomActivityLabel(lastLabelRef.current);

        lastCityRef.current = city.name;
        lastLabelRef.current = label;

        const event: GlobalPulseEvent = {
          id: `${city.name}-${Date.now()}`,
          cityName: city.name,
          label,
          startedAt: performance.now(),
        };

        setActiveEvent(event);

        clearId = window.setTimeout(() => {
          if (cancelled) return;
          setActiveEvent((current) =>
            current?.id === event.id ? null : current
          );
        }, ACTIVITY_PULSE_MS);

        scheduleNext();
      }, randomActivityIntervalMs());
    };

    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(clearId);
    };
  }, [reducedMotion]);

  const getCityIntensity = useCallback((cityName: string) => {
    const event = activeEventRef.current;
    if (!event || event.cityName !== cityName) return 0;
    return intensityFromAge(performance.now() - event.startedAt);
  }, []);

  const isCityActive = useCallback(
    (cityName: string) => getCityIntensity(cityName) > 0.02,
    [getCityIntensity]
  );

  const value = useMemo(
    () => ({
      activeEvent: reducedMotion ? null : activeEvent,
      getCityIntensity,
      isCityActive,
    }),
    [activeEvent, getCityIntensity, isCityActive, reducedMotion]
  );

  return (
    <GlobalPulseContext.Provider value={value}>
      {children}
    </GlobalPulseContext.Provider>
  );
}

export function useGlobalPulse() {
  const ctx = useContext(GlobalPulseContext);
  if (!ctx) {
    throw new Error("useGlobalPulse must be used within GlobalPulseProvider");
  }
  return ctx;
}
