"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../../components/i18n";
import {
  getMeaningsForLocale,
  getMuyassarTafsir,
} from "../../../../lib/hifz/sourcedTexts";
import { quranNotesCopy } from "../../../../lib/hifz/quranUiCopy";
import { getLocaleDirection } from "../../../../lib/i18n/locales";

/**
 * Calm sourced tafsir + translation of the meanings under each ayah.
 * Hidden by default; never invents text; attribution always shown.
 */
export function VerseSourcedNotes({ ayahNumber }: { ayahNumber: number }) {
  const { locale } = useTranslation();
  const pageLocale = locale === "en" ? "ar" : locale;
  const ui = quranNotesCopy(pageLocale);
  const [openTafsir, setOpenTafsir] = useState(false);
  const [openMeanings, setOpenMeanings] = useState(false);

  useEffect(() => {
    setOpenTafsir(false);
    setOpenMeanings(false);
  }, [ayahNumber]);

  const tafsir = getMuyassarTafsir(ayahNumber);
  const meanings = getMeaningsForLocale(locale, ayahNumber);
  const meaningsDir = meanings
    ? getLocaleDirection(meanings.resolvedLocale)
    : "ltr";

  if (!tafsir && !meanings) return null;

  return (
    <div className="mt-3 w-full max-w-xl space-y-2 px-1">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tafsir ? (
          <button
            type="button"
            onClick={() => setOpenTafsir((v) => !v)}
            className="min-h-11 rounded-full border border-[#e8c87a]/30 bg-[#e8c87a]/10 px-4 py-2 text-sm text-[#f5e6b8]"
            aria-expanded={openTafsir}
          >
            {openTafsir ? ui.hide : ui.tafsir}
          </button>
        ) : null}
        {meanings ? (
          <button
            type="button"
            onClick={() => setOpenMeanings((v) => !v)}
            className="min-h-11 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/75"
            aria-expanded={openMeanings}
          >
            {openMeanings ? ui.hide : ui.meanings}
          </button>
        ) : null}
      </div>

      {openTafsir && tafsir ? (
        <div
          className="rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/85 px-4 py-3 text-right"
          dir="rtl"
          lang="ar"
        >
          <p className="text-[11px] text-[#e8c87a]/70">
            {tafsir.source.displayNameAr}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#f3e6c0]/95">
            {tafsir.text}
          </p>
          <p className="mt-3 text-[10px] leading-relaxed text-white/35">
            المصدر: {tafsir.source.displayNameAr} — {tafsir.source.publisher}.
            عبر QuranEnc.com (مفتاح {tafsir.source.quranEncKey}
            {tafsir.source.version ? `، إصدار ${tafsir.source.version}` : ""}).
            Source: QuranEnc.com.
          </p>
        </div>
      ) : null}

      {openMeanings && meanings ? (
        <div
          className="rounded-2xl border border-white/10 bg-[#080816]/85 px-4 py-3"
          dir={meaningsDir}
          lang={meanings.resolvedLocale}
        >
          <p className="text-[11px] text-white/45">
            {ui.meanings}
          </p>
          <p className="mt-1 text-[11px] text-[#e8c87a]/65">
            {locale === "ar"
              ? meanings.source.displayNameAr
              : meanings.source.displayNameEn}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {meanings.text}
          </p>
          <p className="mt-3 text-[10px] leading-relaxed text-white/35">
            {meanings.source.displayNameEn} — {meanings.source.publisher}. Via
            QuranEnc.com (key {meanings.source.quranEncKey}
            {meanings.source.version
              ? `, version ${meanings.source.version}`
              : ""}
            ).
          </p>
        </div>
      ) : null}
    </div>
  );
}
