/**
 * Public URLs for the owner-approved UMTUBA V3 stacked identity.
 * Paths serve exact package files. Do not invent a horizontal lockup.
 */

export const BRAND_ASSETS = {
  lockupStackedDarkSvg: "/brand/official-v3/svg/logo_stacked_dark.svg",
  lockupStackedLightSvg: "/brand/official-v3/svg/logo_stacked_light.svg",
  lockupStackedTransparentSvg:
    "/brand/official-v3/svg/logo_stacked_transparent.svg",
  symbolMasterSvg: "/brand/official-v3/svg/symbol_master.svg",
  lockupStackedTransparentPng:
    "/brand/official-v3/png/logo_stacked_transparent.png",
  symbolMasterPng: "/brand/official-v3/png/symbol_master.png",
  watermarkTransparentPng: "/brand/official-v3/png/watermark_transparent.png",
  icon16: "/brand/official-v3/icons/icon_16.png",
  icon32: "/brand/official-v3/icons/icon_32.png",
  icon48: "/brand/official-v3/icons/icon_48.png",
  icon64: "/brand/official-v3/icons/icon_64.png",
  icon192: "/brand/official-v3/icons/icon_192.png",
  icon512: "/brand/official-v3/icons/icon_512.png",
  appIcon1024: "/brand/official-v3/icons/app_icon_1024.png",
  appIcon1024Dark: "/brand/official-v3/icons/app_icon_1024_dark.png",
  favicon: "/favicon.ico",
} as const;

export type BrandMarkPlacement = "symbol" | "stacked";
export type BrandMarkSurface = "dark" | "light";

export function brandMarkSrc(
  placement: BrandMarkPlacement,
  surface: BrandMarkSurface = "dark"
): string {
  if (placement === "symbol") {
    return BRAND_ASSETS.symbolMasterSvg;
  }
  return surface === "light"
    ? BRAND_ASSETS.lockupStackedLightSvg
    : BRAND_ASSETS.lockupStackedTransparentSvg;
}
