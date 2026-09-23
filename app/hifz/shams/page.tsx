import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/site/metadata";
import HifzShamsExperience from "./HifzShamsExperience";
import "./hifz-shams.css";

export const metadata: Metadata = buildPageMetadata({
  title: "سماء الحفظ",
  description: "تجربة هادئة لحفظ سورة الشمس — نموذج أولي مخفي.",
  path: "/hifz/shams",
  index: "noindex",
});

/**
 * Hidden calm Quran memorization prototype (Surah Ash-Shams only).
 * Not linked from nav, footer, or sitemap. noindex.
 */
export default function HifzShamsPage() {
  return <HifzShamsExperience />;
}
