import { ImageResponse } from "next/og";
import { BRAND, BRAND_COLORS } from "../lib/site/brand";

export const runtime = "edge";
export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Code-generated Open Graph image — brand typography only (no fabricated logo asset).
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(145deg, ${BRAND_COLORS.background} 0%, #0a1628 45%, #0b1a3a 100%)`,
          color: BRAND_COLORS.foreground,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 72,
            height: 8,
            borderRadius: 999,
            background: BRAND_COLORS.accent,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: "0.08em",
              lineHeight: 1.05,
            }}
          >
            {BRAND.name}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              color: "rgba(186, 230, 253, 0.95)",
              letterSpacing: "0.02em",
            }}
          >
            {BRAND.tagline}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.72)",
              marginTop: 4,
            }}
          >
            {BRAND.taglineAr}
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.55)",
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          {BRAND.mission}
        </div>
      </div>
    ),
    { ...size }
  );
}
