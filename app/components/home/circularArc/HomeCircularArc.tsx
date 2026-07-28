"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { layoutCircularArcNodes } from "./arcGeometry";
import HomeCircularArcPortal from "./HomeCircularArcPortal";
import {
  HOME_ARC_FOUNDATION_PORTALS,
  type HomeArcPortal,
} from "./homeCircularArcPortals";

export type HomeCircularArcProps = {
  /** Override portal list (defaults to foundation mock set). */
  portals?: readonly HomeArcPortal[];
  /**
   * Foundation interaction: receives portal id only.
   * Default logs id — no routing.
   */
  onPortalPress?: (portalId: string) => void;
  className?: string;
};

function defaultPortalPress(portalId: string) {
  // Foundation V1 — no navigation.
  console.info("[HomeCircularArc] portal press", portalId);
}

/**
 * Home Circular Arc Navigation Foundation V1
 *
 * Left C-arc overlay of world portals. Does not shrink the video plane.
 * Not a sidebar, drawer, or bottom navigation.
 *
 * Mount only when `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED` is true (fail-closed).
 */
export default function HomeCircularArc({
  portals = HOME_ARC_FOUNDATION_PORTALS,
  onPortalPress = defaultPortalPress,
  className = "",
}: HomeCircularArcProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  const handlePortalPress = useEffectEvent((portalId: string) => {
    onPortalPress(portalId);
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize((prev) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    update();
    // Single observer for the overlay root — never per portal.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes } = layoutCircularArcNodes({
    width: size.width,
    height: size.height,
    count: portals.length,
  });

  return (
    <nav
      ref={rootRef}
      aria-label="UMTUBA world portals"
      data-home-circular-arc="foundation-v1"
      className={`pointer-events-none absolute inset-0 z-30 overflow-hidden ${className}`}
    >
      {nodes.map((layout, index) => {
        const portal = portals[index];
        if (!portal) return null;
        return (
          <HomeCircularArcPortal
            key={portal.id}
            portal={portal}
            layout={layout}
            reduceMotion={reduceMotion}
            onPortalPress={handlePortalPress}
          />
        );
      })}
    </nav>
  );
}
