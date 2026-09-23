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

/** Overlay / tool modes kept outside the guided path. */
export type HifzToolId =
  | "order"
  | "tilawaLink"
  | "linking"
  | "listenBlind";

/** @deprecated Prefer HifzToolId + path steps; kept for gradual migration. */
export type HifzModeId =
  | "learn"
  | "listen"
  | "listenRepeat"
  | "tilawaLink"
  | "fading"
  | "letters"
  | "linking"
  | "order"
  | "sky"
  | "path"
  | "map"
  | "listenBlind";

export type HifzStarProgress = {
  /** ISO timestamp of last calm review / mastery pulse */
  lastReviewedAt: string;
};

/** Legacy v1 shape (stars only). Migrated on read. */
export type HifzLocalProgressV1 = {
  version: 1;
  surah: 91;
  stars: Record<string, HifzStarProgress>;
};

export type HifzVerseProgress = {
  lastRatedAt: string;
  rating: "again" | "unsure" | "remembered";
  dueAt: string;
  streak: number;
  intervalDays: number;
};

export type HifzLocalProgress = {
  version: 2;
  surah: 91;
  verses: Record<string, HifzVerseProgress>;
  /** Soft mirror of v1 for any leftover star helpers. */
  stars: Record<string, HifzStarProgress>;
};
