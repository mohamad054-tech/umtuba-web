import Image from "next/image";
import { BRAND, BRAND_ASSETS } from "../../../lib/site/brand";

export type UmtubaStackedLogoSize =
  | "nav"
  | "hero"
  | "auth"
  | "footer"
  | "legal"
  | "loading";

const SIZE_CLASS: Record<UmtubaStackedLogoSize, string> = {
  nav: "h-11 w-auto",
  hero: "h-[clamp(8.5rem,22vw,14rem)] w-auto",
  auth: "h-20 w-auto sm:h-24",
  footer: "h-16 w-auto",
  legal: "h-10 w-auto",
  loading: "h-28 w-auto",
};

type UmtubaStackedLogoProps = {
  size?: UmtubaStackedLogoSize;
  className?: string;
  priority?: boolean;
};

/**
 * Primary official lockup: symbol above UMTUBA, from the approved End Tag video.
 * Do not substitute a horizontal lockup or regenerated artwork.
 */
export default function UmtubaStackedLogo({
  size = "nav",
  className = "",
  priority = false,
}: UmtubaStackedLogoProps) {
  return (
    <Image
      src={BRAND_ASSETS.stackedLogo}
      alt={BRAND.name}
      width={BRAND_ASSETS.stackedLogoWidth}
      height={BRAND_ASSETS.stackedLogoHeight}
      className={`${SIZE_CLASS[size]} ${className}`.trim()}
      priority={priority}
    />
  );
}
