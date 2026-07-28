"use client";

import { useState } from "react";
import type { HomeArcPortal } from "./homeCircularArcPortals";
import type { ArcNodeLayout } from "./arcGeometry";

type HomeCircularArcPortalProps = {
  portal: HomeArcPortal;
  layout: ArcNodeLayout;
  reduceMotion: boolean;
  onPortalPress: (portalId: string) => void;
};

/**
 * Single luminous portal node — geometry + press foundation only.
 * Glyph letter + border (not color-alone). Real <button> with visible focus.
 */
export default function HomeCircularArcPortal({
  portal,
  layout,
  reduceMotion,
  onPortalPress,
}: HomeCircularArcPortalProps) {
  const [pressed, setPressed] = useState(false);

  const scale = pressed && !reduceMotion ? 0.92 : 1;
  const glowBoost = pressed ? 0.5 : 0.28;

  return (
    <button
      type="button"
      aria-label={`${portal.label} portal`}
      data-portal-id={portal.id}
      className="home-arc-portal pointer-events-auto absolute touch-manipulation rounded-full border border-white/35 bg-white/[0.1] text-center text-xs font-black tracking-wide text-white outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510] focus-visible:ring-sky-300"
      style={{
        width: layout.size,
        height: layout.size,
        minWidth: layout.size,
        minHeight: layout.size,
        left: layout.x - layout.size / 2,
        top: layout.y - layout.size / 2,
        transform: `scale(${scale})`,
        transitionDuration: reduceMotion ? "0ms" : "120ms",
        // Soft glow via box-shadow only (no continuous filter/blur animation).
        boxShadow: `0 0 ${14 + glowBoost * 22}px rgba(56, 189, 248, ${glowBoost}), inset 0 0 10px rgba(255,255,255,0.06)`,
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => onPortalPress(portal.id)}
    >
      <span aria-hidden className="block leading-none">
        {portal.glyph}
      </span>
    </button>
  );
}
