import Image from "next/image";
import {
  BRAND,
  BRAND_ASSETS,
  BRAND_MARK_PRESETS,
  brandMarkSource,
  type BrandMarkKind,
  type BrandMarkPresetId,
} from "../../../lib/site/brand";

export type UmtubaStackedLogoSize = BrandMarkPresetId;

type UmtubaStackedLogoProps = {
  size?: UmtubaStackedLogoSize;
  className?: string;
  priority?: boolean;
};

const FRAME_CLASS =
  "max-w-full object-contain object-center [image-rendering:auto]";

/**
 * Official approved-video mark. Compact chrome uses the symbol only;
 * spacious surfaces use the stacked lockup. Header crops the same stacked
 * raster to U + official wordmark (no LEARN-CREATE-SHARE, no UI text).
 * Never a horizontal lockup and never a generated substitute.
 */
export default function UmtubaStackedLogo({
  size = "nav",
  className = "",
  priority = false,
}: UmtubaStackedLogoProps) {
  const preset = BRAND_MARK_PRESETS[size];
  const mark: BrandMarkKind = preset.mark;
  const stacked = mark === "stacked";
  const headerLockup = size === "header";

  const image = (
    <Image
      src={brandMarkSource(mark)}
      alt={BRAND.name}
      width={stacked ? BRAND_ASSETS.stackedLogoWidth : BRAND_ASSETS.symbolWidth}
      height={
        stacked ? BRAND_ASSETS.stackedLogoHeight : BRAND_ASSETS.symbolHeight
      }
      sizes={preset.sizes}
      quality={90}
      className={`${preset.className} ${headerLockup ? "" : FRAME_CLASS} ${className}`.trim()}
      style={
        headerLockup
          ? { width: "8.5rem", height: "auto", maxHeight: "none" }
          : undefined
      }
      priority={priority}
      draggable={false}
    />
  );

  if (headerLockup) {
    return <span className="umtuba-header-lockup">{image}</span>;
  }

  return image;
}
