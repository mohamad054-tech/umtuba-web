import raw from "../../data/hifz/ash-shams-91.husary-timings.json";
import { tokenizeAyah } from "./tokenize";
import { getAshShamsAyah } from "./ashShamsData";

export type HusaryWordTiming = {
  index: number;
  startMs: number;
  endMs: number;
};

export type HusaryAyahTiming = {
  number: number;
  verseKey: string;
  durationMs: number;
  words: HusaryWordTiming[];
};

type HusaryTimingsPayload = {
  surah: number;
  reciter: string;
  style: string;
  quranComChapterReciterId: number;
  ayat: HusaryAyahTiming[];
};

const data = raw as HusaryTimingsPayload;

function assertAligned(): boolean {
  if (data.surah !== 91 || data.ayat.length !== 15) return false;
  for (const ayahTiming of data.ayat) {
    const text = getAshShamsAyah(ayahTiming.number).text;
    const tokens = tokenizeAyah(text);
    if (tokens.length !== ayahTiming.words.length) return false;
  }
  return true;
}

/** True when every ayah’s segment count matches Uthmani whitespace tokens. */
export const HUSARY_WORD_TIMINGS_USABLE = assertAligned();

export function getHusaryAyahTiming(ayah: number): HusaryAyahTiming | null {
  if (!HUSARY_WORD_TIMINGS_USABLE) return null;
  const row = data.ayat[ayah - 1];
  if (!row || row.number !== ayah) return null;
  return row;
}

/**
 * 0-based word index currently recited, or -1 if outside word windows.
 * `elapsedMs` is relative to the start of the ayah clip.
 */
export function wordIndexAtMs(
  ayah: number,
  elapsedMs: number,
  scale = 1,
): number {
  const timing = getHusaryAyahTiming(ayah);
  if (!timing || !Number.isFinite(elapsedMs)) return -1;
  const t = elapsedMs / (scale > 0 ? scale : 1);
  for (let i = 0; i < timing.words.length; i++) {
    const w = timing.words[i];
    if (t >= w.startMs && t < w.endMs) return i;
  }
  if (t >= 0 && timing.words.length > 0) {
    const last = timing.words[timing.words.length - 1];
    if (t >= last.startMs && t <= timing.durationMs) {
      return timing.words.length - 1;
    }
  }
  return -1;
}
