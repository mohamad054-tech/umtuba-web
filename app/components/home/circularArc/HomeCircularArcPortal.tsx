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
 * Portal disc — glass + soft shadow at rest; stronger glow only on hover/active.
 */
export default function HomeCircularArcPortal({
  portal,
  layout,
  reduceMotion,
  onPortalPress,
}: HomeCircularArcPortalProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const active = hovered || pressed;
  const scale = reduceMotion
    ? 1
    : pressed
      ? 0.94
      : hovered
        ? 1.07
        : 1;

  const restShadow =
    "0 6px 18px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset";
  const activeShadow =
    "0 8px 22px rgba(0,0,0,0.4), 0 0 22px rgba(56,189,248,0.45), 0 0 40px rgba(56,189,248,0.2), 0 1px 0 rgba(255,255,255,0.18) inset";

  return (
    <button
      type="button"
      aria-label={`${portal.label} portal`}
      data-portal-id={portal.id}
      className="home-arc-portal pointer-events-auto absolute touch-manipulation rounded-full border text-center text-[11px] font-black tracking-wide text-white/95 outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-sky-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510]"
      style={{
        width: layout.size,
        height: layout.size,
        minWidth: layout.size,
        minHeight: layout.size,
        left: layout.x - layout.size / 2,
        top: layout.y - layout.size / 2,
        transform: `scale(${scale})`,
        transition: reduceMotion
          ? "none"
          : "transform 160ms ease-out, box-shadow 180ms ease-out, background-color 180ms ease-out, border-color 180ms ease-out",
        borderColor: active
          ? "rgba(186, 230, 253, 0.65)"
          : "rgba(255, 255, 255, 0.38)",
        background: active
          ? "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(125,211,252,0.14))"
          : "linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
        boxShadow: active ? activeShadow : restShadow,
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => onPortalPress(portal.id)}
    >
      <span aria-hidden className="block leading-none drop-shadow-sm">
        {portal.glyph}
      </span>
    </button>
  );
}
