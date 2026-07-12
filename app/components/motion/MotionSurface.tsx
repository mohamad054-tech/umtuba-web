"use client";

import { useMotion } from "./MotionProvider";

/**
 * Feature-agnostic motion host.
 * Renders no product UI — only exposes live engine status for debugging/surfaces.
 * Watch, Journey, Globe, and routing must NOT be imported here.
 */
export default function MotionSurface() {
  const { status, active, lastEvent } = useMotion();

  return (
    <div
      data-umtuba-motion-surface=""
      data-motion-status={status}
      data-motion-run={active?.runId ?? ""}
      data-motion-transition={active?.transitionId ?? ""}
      data-motion-phase={active?.phaseId ?? ""}
      data-motion-last-event={lastEvent?.type ?? ""}
      hidden
      aria-hidden
    />
  );
}
