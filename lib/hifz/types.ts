export type HifzAyah = {
  number: number;
  text: string;
  verseKey?: string;
};

export type HifzSurahPayload = {
  surah: number;
  transliteration: string;
  ayahCount: number;
  script: string;
  crossCheckWordByWord100Percent: boolean;
  ayat: HifzAyah[];
};

export type HifzModeId =
  | "learn"
  | "listen"
  | "listenRepeat"
  | "tilawaLink"
  | "fading"
  | "letters"
  | "linking"
  | "order"
  | "sky";

export type HifzStarProgress = {
  /** ISO timestamp of last calm review / mastery pulse */
  lastReviewedAt: string;
};

export type HifzLocalProgress = {
  version: 1;
  surah: 91;
  /** Ayah number (1–15) → progress */
  stars: Record<string, HifzStarProgress>;
};
