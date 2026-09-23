import type { Metadata } from "next";
import { buildPageMetadata } from "../../../../lib/site/metadata";
import { LEARNING_QURAN_ROUTES } from "../../../../lib/hifz/routes";
import HifzShamsExperience from "./HifzShamsExperience";
import "./hifz-shams.css";

export const metadata: Metadata = buildPageMetadata({
  title: "سورة الشمس — Surah ash-Shams",
  description:
    "Calm memorization experience for Surah ash-Shams — free UMTUBA Learning content.",
  path: LEARNING_QURAN_ROUTES.shams,
  index: "noindex",
});

/**
 * Surah ash-Shams memorization experience under Learning.
 * noindex. Canonical path: /learning/quran/shams (legacy /hifz/shams redirects permanently).
 */
export default function LearningQuranShamsPage() {
  return <HifzShamsExperience />;
}
