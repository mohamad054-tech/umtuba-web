/**
 * Husary murattal streaming helpers for Surah Ash-Shams.
 * Audio is streamed from Quranicaudio/EveryAyah mirrors as returned by Quran.com —
 * do not commit audio binaries.
 */

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

/** Extra silence after an ayah during listen-and-repeat (fraction of ayah length). */
export const REPEAT_PAUSE_EXTRA_RATIO = 0.2;

/** Minimum extra pause so very short ayat still leave room to repeat. */
export const REPEAT_PAUSE_MIN_EXTRA_MS = 600;

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
 * ≈ ayah duration + a little extra.
 */
export function repeatPauseMs(ayahDurationMs: number): number {
  const duration = Math.max(0, ayahDurationMs);
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
