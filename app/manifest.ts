import type { MetadataRoute } from "next";
import { BRAND, BRAND_ASSETS, BRAND_COLORS, DEFAULT_DESCRIPTION } from "../lib/site/brand";

/**
 * Web app manifest.
 *
 * Icons are the extracted sizes from UMTUBA_LOGO_FROM_APPROVED_VIDEO_V1.
 * Do not substitute V2/V3/V4 artwork.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.background,
    theme_color: BRAND_COLORS.theme,
    lang: "en",
    categories: ["social", "entertainment"],
    icons: [
      {
        src: BRAND_ASSETS.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ASSETS.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BRAND_ASSETS.icon180,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
