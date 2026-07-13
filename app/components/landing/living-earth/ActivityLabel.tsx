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
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(false);
      setLabel(null);
      setEventId(null);
      return;
    }

    if (!activeEvent || activeEvent.cityName !== cityName) {
      setVisible(false);
      return;
    }

    setLabel(activeEvent.label);
    setEventId(activeEvent.id);
    // Next frame so CSS transition can fade in from opacity 0.
    const showId = window.requestAnimationFrame(() => setVisible(true));
    const hideId = window.setTimeout(() => setVisible(false), ACTIVITY_LABEL_MS);

    return () => {
      window.cancelAnimationFrame(showId);
      window.clearTimeout(hideId);
    };
  }, [activeEvent, cityName, reducedMotion]);

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
