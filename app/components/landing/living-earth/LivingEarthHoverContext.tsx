"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LivingCity } from "./types";

type LivingEarthHoverValue = {
  hoveredCity: LivingCity | null;
  setHoveredCity: (city: LivingCity | null) => void;
};

const LivingEarthHoverContext = createContext<LivingEarthHoverValue | null>(
  null
);

export function LivingEarthHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredCity, setHoveredCity] = useState<LivingCity | null>(null);
  const value = useMemo(
    () => ({ hoveredCity, setHoveredCity }),
    [hoveredCity]
  );

  return (
    <LivingEarthHoverContext.Provider value={value}>
      {children}
    </LivingEarthHoverContext.Provider>
  );
}

export function useLivingEarthHover() {
  const ctx = useContext(LivingEarthHoverContext);
  if (!ctx) {
    throw new Error("useLivingEarthHover must be used within provider");
  }
  return ctx;
}
