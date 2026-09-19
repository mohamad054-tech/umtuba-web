"use client";

import { useEffect, useRef } from "react";
import { track, type AnalyticsEventMap, type AnalyticsEventName } from "../../../lib/analytics/track";

export default function TrackOnce<E extends AnalyticsEventName>({
  event,
  properties,
}: {
  event: E;
  properties?: AnalyticsEventMap[E];
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, properties);
  }, [event, properties]);
  return null;
}
