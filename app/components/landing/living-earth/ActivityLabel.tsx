"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import { ACTIVITY_LABEL_MS } from "./globalPulseData";
import { useGlobalPulse } from "./GlobalPulseContext";

type ActivityLabelProps = {
  cityName: string;
  reducedMotion: boolean;
};

export default function ActivityLabel({
  cityName,
  reducedMotion,
}: ActivityLabelProps) {
  const { activeEvent } = useGlobalPulse();
  const matching =
    !reducedMotion && activeEvent && activeEvent.cityName === cityName
      ? activeEvent
      : null;

  const [visible, setVisible] = useState(false);
  const label = matching?.label ?? null;
  const eventId = matching?.id ?? null;

  useEffect(() => {
    if (!matching) {
      const clearId = window.requestAnimationFrame(() => setVisible(false));
      return () => window.cancelAnimationFrame(clearId);
    }

    const showId = window.requestAnimationFrame(() => setVisible(true));
    const hideId = window.setTimeout(() => setVisible(false), ACTIVITY_LABEL_MS);

    return () => {
      window.cancelAnimationFrame(showId);
      window.clearTimeout(hideId);
    };
  }, [matching]);

  if (!label || !eventId) return null;

  return (
    <Html
      position={[0, 0.28, 0]}
      center
      distanceFactor={9}
      zIndexRange={[55, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        key={eventId}
        className={`global-pulse-label ${visible ? "is-visible" : ""}`}
        aria-hidden
      >
        {label}
      </div>
    </Html>
  );
}
