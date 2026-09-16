import type { Metadata } from "next";
import { DEMO_PREVIEW_PATH } from "../store/demoPreviewGate";
import { BRAND } from "./brand";
import { buildPageMetadata } from "./metadata";

export function demoPreviewPath(slug?: string | null): string {
  const value = slug?.trim() ?? "";
  if (!value || value.includes("/") || value.includes("?")) {
    return DEMO_PREVIEW_PATH;
  }
  return `${DEMO_PREVIEW_PATH}/${value}`;
}

/** Private demo / sample store surfaces: noindex, nofollow, self-canonical. */
export function buildDemoPreviewMetadata(input: {
  title: string;
  description?: string;
  slug?: string | null;
}): Metadata {
  return buildPageMetadata({
    title: input.title,
    description:
      input.description?.trim() ||
      `Private ${BRAND.name} demo catalog. Sample only — not for sale.`,
    path: demoPreviewPath(input.slug),
    index: "noindex",
    hreflang: false,
  });
}
