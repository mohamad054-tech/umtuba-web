import { BRAND } from "../../../lib/site/brand";
import {
  brandMarkSrc,
  type BrandMarkPlacement,
  type BrandMarkSurface,
} from "../../../lib/site/brandAssets";

type UmtubaBrandMarkProps = {
  /** Compact chrome uses the approved symbol. Primary brand areas use stacked. */
  placement: BrandMarkPlacement;
  /** Dark UI uses the transparent stacked lockup; light uses the light master. */
  surface?: BrandMarkSurface;
  className?: string;
  alt?: string;
};

/**
 * Renders the exact approved V3 asset. Never traces, crops, or invents a
 * horizontal lockup.
 */
export default function UmtubaBrandMark({
  placement,
  surface = "dark",
  className,
  alt,
}: UmtubaBrandMarkProps) {
  const src = brandMarkSrc(placement, surface);
  const resolvedAlt =
    alt ??
    (placement === "stacked"
      ? `${BRAND.name} — ${BRAND.tagline}`
      : BRAND.name);

  return (
    // Exact approved PNG master from /public/brand/official-v3 — do not inline/redraw.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={resolvedAlt}
      className={className}
      draggable={false}
      style={{ objectFit: "contain", overflow: "visible" }}
    />
  );
}
