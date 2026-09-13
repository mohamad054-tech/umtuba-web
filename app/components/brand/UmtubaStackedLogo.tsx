import Image from "next/image";
import {
  BRAND,
  BRAND_MARK_PRESETS,
  brandMarkSource,
  brandMarkSourceHeight,
  brandMarkSourceWidth,
  type BrandMarkKind,
  type BrandMarkPresetId,
} from "../../../lib/site/brand";

export type UmtubaStackedLogoSize = BrandMarkPresetId;

type UmtubaStackedLogoProps = {
  size?: UmtubaStackedLogoSize;
  className?: string;
  priority?: boolean;
};

/**
 * Official approved-video mark. Compact chrome uses the symbol only;
 * spacious surfaces use the stacked lockup. Never a horizontal lockup.
 *
 * Clipping is prevented only via frame sizing, source aspect-ratio,
 * object-fit: contain, and overflow: visible. The raster is unchanged.
 */
export default function UmtubaStackedLogo({
  size = "nav",
  className = "",
  priority = false,
}: UmtubaStackedLogoProps) {
  const preset = BRAND_MARK_PRESETS[size];
  const mark: BrandMarkKind = preset.mark;
  const width = brandMarkSourceWidth(mark);
  const height = brandMarkSourceHeight(mark);

  return (
    <span
      className={`${preset.frameClassName} ${className}`.trim()}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={brandMarkSource(mark)}
        alt={BRAND.name}
        width={width}
        height={height}
        sizes={preset.sizes}
        quality={90}
        className={preset.className}
        style={{ objectFit: "contain", objectPosition: "center" }}
        priority={priority}
        draggable={false}
      />
    </span>
  );
}
