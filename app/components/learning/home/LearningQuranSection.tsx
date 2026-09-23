"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { LEARNING_QURAN_ROUTES } from "../../../../lib/hifz/routes";
import { line, quranUi } from "../../../../lib/hifz/quranUiCopy";

/**
 * First-party free Quran/Hadith entry on the Learning home.
 * Visually distinct from partner/affiliate course cards (no price, no outbound chrome).
 */
export function LearningQuranSection() {
  const { locale } = useTranslation();
  const ui = quranUi(locale);
  const rtl = locale === "ar";

  return (
    <section
      data-learning-quran-section
      className="rounded-[28px] border border-[#c9a227]/35 bg-[linear-gradient(145deg,rgba(20,16,48,0.95),rgba(8,10,28,0.98)_55%,rgba(30,24,12,0.55))] px-5 py-6 md:px-7"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className={`flex flex-wrap items-start justify-between gap-3 ${rtl ? "" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#e8c87a]/80">
            {line(locale, ui.freeBadgeAr, ui.freeBadgeEn)}
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-[#f7efd8] md:text-2xl">
            {line(locale, ui.sectionTitleAr, ui.sectionTitleEn)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
            {line(locale, ui.sectionBodyAr, ui.sectionBodyEn)}
          </p>
        </div>
      </div>

      <article className="mt-5 rounded-[22px] border border-white/10 bg-black/25 px-4 py-4">
        <h3 className="text-lg font-bold text-[#f3e6c0]">
          {line(locale, ui.shamsCardTitleAr, ui.shamsCardTitleEn)}
        </h3>
        <p className="mt-1 text-sm text-white/55">
          {line(locale, ui.shamsCardBodyAr, ui.shamsCardBodyEn)}
        </p>
        <div className={`mt-4 flex flex-wrap gap-2 ${rtl ? "flex-row-reverse justify-end" : ""}`}>
          <Link
            href={LEARNING_QURAN_ROUTES.shams}
            className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-[#e8c87a]/90 px-5 py-2 text-sm font-bold text-[#1a1208]"
          >
            {line(locale, ui.memorizeCtaAr, ui.memorizeCtaEn)}
          </Link>
          <Link
            href={LEARNING_QURAN_ROUTES.section}
            className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white/80"
          >
            {line(locale, ui.openAr, ui.openEn)}
          </Link>
        </div>
      </article>
    </section>
  );
}
