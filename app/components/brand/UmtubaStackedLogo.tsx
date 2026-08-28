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
 * spacious surfaces use the stacked lockup. Never a horizontal lockup.
 */
export default function UmtubaStackedLogo({
  size = "nav",
  className = "",
  priority = false,
}: UmtubaStackedLogoProps) {
  const preset = BRAND_MARK_PRESETS[size];
  const mark: BrandMarkKind = preset.mark;
  const stacked = mark === "stacked";

  return (
    <Image
      src={brandMarkSource(mark)}
      alt={BRAND.name}
      width={stacked ? BRAND_ASSETS.stackedLogoWidth : BRAND_ASSETS.symbolWidth}
      height={
        stacked ? BRAND_ASSETS.stackedLogoHeight : BRAND_ASSETS.symbolHeight
      }
      sizes={preset.sizes}
      quality={90}
      className={`${preset.className} ${FRAME_CLASS} ${className}`.trim()}
      priority={priority}
      draggable={false}
    />
  );
}
