"use client";

import type { CSSProperties } from "react";
import type { VideoOverlayElement } from "../../../lib/media/videoOverlays";

type VideoOverlayLayerProps = {
  elements: VideoOverlayElement[] | null | undefined;
  /** Extra classes for the absolutely-positioned layer. */
  className?: string;
};

/**
 * Read-only renderer for published video overlays. Purely presentational and
 * `pointer-events-none`, so it never intercepts playback taps or controls.
 *
 * Sizing uses container query units (`cqmin`) against the layer, so overlays
 * scale proportionally on every surface (feed, watch, mobile) without any
 * JavaScript measurement.
 */
export default function VideoOverlayLayer({
  elements,
  className,
}: VideoOverlayLayerProps) {
  if (!elements || elements.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-10 overflow-hidden ${className ?? ""}`}
      style={{ containerType: "size" }}
    >
      {elements.map((el) => {
        const baseStyle: CSSProperties = {
          position: "absolute",
          left: `${el.x * 100}%`,
          top: `${el.y * 100}%`,
          transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
          fontSize: `${el.scale * 100}cqmin`,
          lineHeight: 1.1,
          maxWidth: "92%",
        };

        if (el.kind === "sticker") {
          return (
            <span
              key={el.id}
              style={{
                ...baseStyle,
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
              }}
            >
              {el.emoji}
            </span>
          );
        }

        return (
          <span
            key={el.id}
            style={{
              ...baseStyle,
              color: el.color ?? "#ffffff",
              fontWeight: 800,
              textAlign: "center",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              textShadow:
                el.color && el.color.toLowerCase() === "#000000"
                  ? "0 1px 4px rgba(255,255,255,0.55)"
                  : "0 2px 8px rgba(0,0,0,0.55)",
            }}
          >
            {el.text}
          </span>
        );
      })}
    </div>
  );
}
