import type { MetadataRoute } from "next";
import { BRAND, BRAND_COLORS, DEFAULT_DESCRIPTION } from "../lib/site/brand";
import { BRAND_ASSETS } from "../lib/site/brandAssets";

/**
 * Web app manifest.
 * Icons are exact approved V3 symbol assets.
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
        src: BRAND_ASSETS.appIcon1024,
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
