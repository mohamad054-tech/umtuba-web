"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "./MotionProvider";
import MotionSurface from "./MotionSurface";

/**
 * App-level motion wiring. Registration happens explicitly inside MotionProvider
 * via registerDefaultMotionTransitions — not via import side effects.
 */
export default function AppMotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionProvider registerDefaults>
      <MotionSurface />
      {children}
    </MotionProvider>
  );
}
