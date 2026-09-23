import { firstTokens, lastTokens } from "./tokenize";
import type { HifzAyah } from "./types";

export type LinkingPrompt = {
  /** Ayah whose ending is shown (1–14). */
  fromAyah: number;
  endSnippet: string;
  /** Correct next ayah number. */
  correctAyah: number;
  options: Array<{ ayah: number; snippet: string }>;
};

/**
 * Build a linking prompt: end of ayah N + three real beginnings from this surah.
 * All snippets are slices of downloaded text (never invented).
 */
export function buildLinkingPrompt(
  ayat: readonly HifzAyah[],
  fromAyah: number,
  endWordCount = 3,
  startWordCount = 3,
): LinkingPrompt | null {
  if (fromAyah < 1 || fromAyah >= ayat.length) return null;
  const current = ayat[fromAyah - 1];
  const correct = ayat[fromAyah];
  if (!current || !correct) return null;

  const distractorPool = ayat
    .filter((a) => a.number !== correct.number && a.number !== current.number)
    .map((a) => a.number);

  // Deterministic pick of two distractors from the surah (stable for UI tests).
  const distractors: number[] = [];
  for (let i = 0; i < distractorPool.length && distractors.length < 2; i++) {
    const idx = (fromAyah * 3 + i * 5) % distractorPool.length;
    const n = distractorPool[idx];
    if (!distractors.includes(n)) distractors.push(n);
  }
  // Fill if collision
  for (const n of distractorPool) {
    if (distractors.length >= 2) break;
    if (!distractors.includes(n)) distractors.push(n);
  }

  const optionAyahs = [correct.number, ...distractors].slice(0, 3);
  // Stable shuffle by fromAyah
  const shuffled = [...optionAyahs].sort(
    (a, b) => ((a * 17 + fromAyah) % 11) - ((b * 17 + fromAyah) % 11),
  );

  return {
    fromAyah: current.number,
    endSnippet: lastTokens(current.text, endWordCount),
    correctAyah: correct.number,
    options: shuffled.map((n) => {
      const ayah = ayat[n - 1];
      return {
        ayah: n,
        snippet: firstTokens(ayah.text, startWordCount),
      };
    }),
  };
}
