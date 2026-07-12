"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  consumeJourneyHandoff,
  type JourneyHandoffPayload,
} from "../../lib/journey/handoff";

/**
 * Consumes a watch→journey handoff exactly once on /post-journey.
 * Missing / invalid / expired handoff → null (default journey unchanged).
 */
export function useJourneyHandoffArrival() {
  const searchParams = useSearchParams();
  const [handoff, setHandoff] = useState<JourneyHandoffPayload | null>(null);
  const [ready, setReady] = useState(false);

  const fromWatch = searchParams.get("from") === "watch";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!fromWatch) {
        setHandoff(null);
        setReady(true);
        return;
      }

      setHandoff(consumeJourneyHandoff());
      setReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [fromWatch]);

  const dismiss = useCallback(() => {
    setHandoff(null);
  }, []);

  return {
    ready,
    fromWatch,
    handoff,
    dismiss,
  };
}
