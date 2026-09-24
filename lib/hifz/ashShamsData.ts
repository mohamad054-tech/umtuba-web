import raw from "../../data/hifz/ash-shams-91.uthmani.json";
import type { HifzAyah, HifzSurahPayload } from "./types";

const EXPECTED_AYAH_COUNT = 15;
const EXPECTED_SURAH = 91;

function assertPayload(data: HifzSurahPayload): HifzSurahPayload {
  if (data.surah !== EXPECTED_SURAH) {
    throw new Error(`Expected surah ${EXPECTED_SURAH}, got ${data.surah}`);
  }
  if (data.ayahCount !== EXPECTED_AYAH_COUNT || data.ayat.length !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_AYAH_COUNT} ayat, got ayahCount=${data.ayahCount} len=${data.ayat.length}`,
    );
  }
  if (!data.crossCheckWordByWord100Percent) {
    throw new Error("Refusing to load Ash-Shams data without 100% cross-check flag");
  }
  for (let i = 0; i < data.ayat.length; i++) {
    const ayah = data.ayat[i];
    if (ayah.number !== i + 1) {
      throw new Error(`Ayah number mismatch at index ${i}: ${ayah.number}`);
    }
    if (typeof ayah.text !== "string" || ayah.text.trim().length === 0) {
      throw new Error(`Empty ayah text at ${ayah.number}`);
    }
  }
  return data;
}

/** Validated Surah 91 payload from downloaded Uthmani JSON. */
export const ASH_SHAMS: HifzSurahPayload = assertPayload(
  raw as HifzSurahPayload,
);

export function getAshShamsAyat(): readonly HifzAyah[] {
  return ASH_SHAMS.ayat;
}

export function getAshShamsAyah(number: number): HifzAyah {
  const ayah = ASH_SHAMS.ayat[number - 1];
  if (!ayah || ayah.number !== number) {
    throw new Error(`Ayah ${number} not found`);
  }
  return ayah;
}

/** Public image path for ayat 1–15; null outside that range. */
export function ayahImageSrc(ayahNumber: number): string | null {
  if (ayahNumber >= 1 && ayahNumber <= 15) {
    return `/hifz/shams/shams-${ayahNumber}.webp`;
  }
  return null;
}
