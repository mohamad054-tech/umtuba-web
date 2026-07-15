import type { MetadataRoute } from "next";
import { BRAND, BRAND_COLORS, DEFAULT_DESCRIPTION } from "../lib/site/brand";

/**
 * Web app manifest.
 *
 * Icons: only `app/favicon.ico` is present in the repo.
 * Missing dedicated PWA sizes (192×192, 512×512) and apple-touch-icon —
 * do not fabricate unreviewed logo assets; favicon is referenced as `any`.
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
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
  };
}