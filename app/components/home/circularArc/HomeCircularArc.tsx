"use client";

import { useEffectEvent } from "react";
import {
  HOME_ARC_FOUNDATION_PORTALS,
  type HomeArcPortal,
} from "./homeCircularArcPortals";

export type HomeCircularArcProps = {
  portals?: readonly HomeArcPortal[];
  onPortalPress?: (portalId: string) => void;
  className?: string;
};

/**
 * Final approved arc (px). Slightly stronger gentle bulge (peak 14px).
 * Negative = toward video edge.
 */
const LEFT_ARC_TRANSLATE_X_PX = [0, -6, -11, -14, -11, -6, 0] as const;

function defaultPortalPress(portalId: string) {
  console.info("[HomeCircularArc] portal press", portalId);
}

/**
 * Left Action Rail — same circle chrome as DiscoverActionRail
 * (`watch-rail-btn` h-12). Height comes from the host (right-rail box).
 * Arc = fixed translateX only.
 */
export default function HomeCircularArc({
  portals = HOME_ARC_FOUNDATION_PORTALS,
  onPortalPress = defaultPortalPress,
  className = "",
}: HomeCircularArcProps) {
  const handlePortalPress = useEffectEvent((portalId: string) => {
    onPortalPress(portalId);
  });

  return (
    <nav
      aria-label="UMTUBA world portals"
      data-home-circular-arc="left-action-rail"
      className={`relative flex h-full flex-col items-center justify-between ${className}`}
    >
      {portals.map((portal, index) => {
        const offsetX =
          LEFT_ARC_TRANSLATE_X_PX[
            Math.min(index, LEFT_ARC_TRANSLATE_X_PX.length - 1)
          ] ?? 0;

        return (
          <div
            key={portal.id}
            style={{ transform: `translateX(${offsetX}px)` }}
          >
            <button
              type="button"
              aria-label={`${portal.label} portal`}
              data-portal-id={portal.id}
              onClick={() => handlePortalPress(portal.id)}
              className="watch-focus-ring flex items-center justify-center"
            >
              <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-[11px] font-black tracking-wide text-white backdrop-blur-md">
                <span aria-hidden className="leading-none">
                  {portal.glyph}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
