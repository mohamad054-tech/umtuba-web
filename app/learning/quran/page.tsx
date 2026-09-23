import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/site/metadata";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { LEARNING_QURAN_ROUTES } from "../../../lib/hifz/routes";
import { line, quranUi } from "../../../lib/hifz/quranUiCopy";

export const metadata: Metadata = buildPageMetadata({
  title: "القرآن الكريم — The Noble Quran",
  description:
    "Free calm Quran learning on UMTUBA. Surah ash-Shams memorization.",
  path: LEARNING_QURAN_ROUTES.section,
  index: "noindex",
});

/**
 * Learning → Quran section home. Only lists what exists (ash-Shams).
 * noindex. Not in public sitemap/nav beyond Learning.
 */
export default async function LearningQuranHomePage() {
  const { locale } = await resolveRequestLocale();
  const ui = quranUi(locale);
  const rtl = locale === "ar";

  return (
    <main
      className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#1a1540_0%,#0a0a1a_45%,#050510_100%)] px-4 py-8 text-white"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/learning"
          className="watch-focus-ring inline-flex min-h-11 items-center text-sm text-white/60 hover:text-white"
        >
          {line(locale, ui.backToLearningAr, ui.backToLearningEn)}
        </Link>

        <p className="mt-6 text-[11px] font-semibold tracking-[0.2em] text-[#e8c87a]/75">
          {line(locale, ui.freeBadgeAr, ui.freeBadgeEn)}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f7efd8]">
          {line(locale, ui.quranHomeTitleAr, ui.quranHomeTitleEn)}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
          {line(locale, ui.quranHomeBodyAr, ui.quranHomeBodyEn)}
        </p>

        <article className="mt-8 rounded-[28px] border border-[#e8c87a]/25 bg-[#080816]/80 p-6">
          <h2 className="text-xl font-bold text-[#f3e6c0]">
            {line(locale, ui.shamsCardTitleAr, ui.shamsCardTitleEn)}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {line(locale, ui.shamsCardBodyAr, ui.shamsCardBodyEn)}
          </p>
          <Link
            href={LEARNING_QURAN_ROUTES.shams}
            className="watch-focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#e8c87a]/90 px-6 py-2 text-sm font-bold text-[#1a1208]"
          >
            {line(locale, ui.memorizeCtaAr, ui.memorizeCtaEn)}
          </Link>
        </article>
      </div>
    </main>
  );
}
