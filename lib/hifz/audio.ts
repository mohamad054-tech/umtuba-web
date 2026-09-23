/**
 * Husary murattal streaming helpers for Surah Ash-Shams.
 * Audio is streamed from Quranicaudio/EveryAyah mirrors as returned by Quran.com —
 * do not commit audio binaries.
 */

import { getHusaryAyahTiming } from "./husaryTimings";

/** Quran.com ayah-recitation id for Mahmoud Khalil Al-Husary (murattal). */
export const HUSARY_MURATTAL_RECITATION_ID = 6;

/** CDN folder used by Quran.com for this reciter (128kbps variant of same set). */
export const HUSARY_CDN_FOLDER = "Husary_128kbps";

const CDN_ORIGIN = "https://mirrors.quranicaudio.com/everyayah";

export const HUSARY_AUDIO_TERMS_URL =
  "https://api-docs.quran.com/legal/developer-terms/";

export const HUSARY_AUDIO_ATTRIBUTION =
  "التلاوة: الشيخ محمود خليل الحصري (مرتّل) — عبر قرآن دوت كوم / مؤسسة القرآن";

export type HifzAudioClipId = "basmala" | number;

export type RepeatCount = 1 | 3 | 5 | 7;

export const DEFAULT_REPEAT_COUNT: RepeatCount = 3;

export const REPEAT_COUNT_OPTIONS: readonly RepeatCount[] = [1, 3, 5, 7];

/** How long the silent gap is between listen-and-repeat rounds. */
export type RepeatPauseLength = "short" | "medium" | "long";

export const DEFAULT_REPEAT_PAUSE_LENGTH: RepeatPauseLength = "short";

export const REPEAT_PAUSE_LENGTH_OPTIONS: readonly {
  id: RepeatPauseLength;
  label: string;
}[] = [
  { id: "short", label: "قصيرة" },
  { id: "medium", label: "متوسطة" },
  { id: "long", label: "طويلة" },
];

/** Extra silence after an ayah for the LONG pause (fraction of ayah length). */
export const REPEAT_PAUSE_EXTRA_RATIO = 0.2;

/** Minimum extra pause on LONG so very short ayat still leave room to repeat. */
export const REPEAT_PAUSE_MIN_EXTRA_MS = 600;

/** Floor for SHORT pause (brief breath). */
export const REPEAT_PAUSE_SHORT_MIN_MS = 450;

/** Floor for MEDIUM pause. */
export const REPEAT_PAUSE_MEDIUM_MIN_MS = 700;

export function padSurahAyah(surah: number, ayah: number): string {
  return `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}`;
}

/** Stream URL for one ayah (1–15). Loads only when assigned to an audio element. */
export function husaryAyahUrl(ayah: number, surah = 91): string {
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > 15) {
    throw new Error(`Invalid Ash-Shams ayah for audio: ${ayah}`);
  }
  return `${CDN_ORIGIN}/${HUSARY_CDN_FOLDER}/${padSurahAyah(surah, ayah)}.mp3`;
}

/**
 * Shared basmala clip for this reciter (EveryAyah `bismillah.mp3`,
 * same bytes as `001001.mp3` for Husary — not Ash-Shams ayah 1).
 */
export function husaryBasmalaUrl(): string {
  return `${CDN_ORIGIN}/${HUSARY_CDN_FOLDER}/bismillah.mp3`;
}

export function husaryClipUrl(clip: HifzAudioClipId): string {
  if (clip === "basmala") return husaryBasmalaUrl();
  return husaryAyahUrl(clip);
}

/**
 * Silent pause after hearing an ayah so the learner can repeat aloud.
 * SHORT (default) = brief breath; MEDIUM a bit longer; LONG ≈ ayah length + a little
 * (the old default that felt too long).
 */
export function repeatPauseMs(
  ayahDurationMs: number,
  length: RepeatPauseLength = DEFAULT_REPEAT_PAUSE_LENGTH,
): number {
  const duration = Math.max(0, ayahDurationMs);
  if (length === "short") {
    return Math.max(REPEAT_PAUSE_SHORT_MIN_MS, Math.round(duration * 0.28));
  }
  if (length === "medium") {
    return Math.max(REPEAT_PAUSE_MEDIUM_MIN_MS, Math.round(duration * 0.55));
  }
  const extra = Math.max(
    REPEAT_PAUSE_MIN_EXTRA_MS,
    Math.round(duration * REPEAT_PAUSE_EXTRA_RATIO),
  );
  return duration + extra;
}

/** Visual fade of ayah words across listen-and-repeat rounds (does not alter text). */
export function repeatWordOpacity(
  repeatIndex: number,
  repeatCount: RepeatCount,
): number {
  if (repeatCount <= 1) return 1;
  const t = Math.min(1, Math.max(0, repeatIndex / (repeatCount - 1)));
  return Math.max(0.28, 1 - t * 0.55);
}

export type AudioPlayMode = "single" | "repeat" | "tilawaLink" | "surah";

export type HusaryQueueItem = {
  clip: HifzAudioClipId;
  /** When set, after this clip ends wait silently then continue (listen & repeat). */
  pauseAfterMs?: number;
  repeatIndex?: number;
  repeatCount?: RepeatCount;
};

/**
 * Pure queue builder for Husary playback modes.
 * tilawaLink continues from the start clip through ayah 15 (or basmala then 1–15).
 */
export function buildHusaryQueue(
  mode: AudioPlayMode,
  start: HifzAudioClipId,
  repeatCount: RepeatCount,
  pauseLength: RepeatPauseLength = DEFAULT_REPEAT_PAUSE_LENGTH,
): HusaryQueueItem[] {
  if (mode === "single") {
    return [{ clip: start }];
  }
  if (mode === "repeat") {
    if (start === "basmala") return [{ clip: "basmala" }];
    const ayah = start;
    const durationMs = getHusaryAyahTiming(ayah)?.durationMs ?? 5000;
    const pause = repeatPauseMs(durationMs, pauseLength);
    const items: HusaryQueueItem[] = [];
    for (let i = 0; i < repeatCount; i++) {
      items.push({
        clip: ayah,
        pauseAfterMs: i < repeatCount - 1 ? pause : undefined,
        repeatIndex: i,
        repeatCount,
      });
    }
    return items;
  }
  if (mode === "tilawaLink") {
    if (start === "basmala") {
      const items: HusaryQueueItem[] = [{ clip: "basmala" }];
      for (let n = 1; n <= 15; n++) items.push({ clip: n });
      return items;
    }
    const from = typeof start === "number" ? start : 1;
    const items: HusaryQueueItem[] = [];
    for (let n = from; n <= 15; n++) items.push({ clip: n });
    return items;
  }
  // whole surah
  const items: HusaryQueueItem[] = [{ clip: "basmala" }];
  for (let n = 1; n <= 15; n++) items.push({ clip: n });
  return items;
}
