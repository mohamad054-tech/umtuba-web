import type { AppLocale } from "../locales";
import type { TranslationKey } from "./types";

/** New game strings only. Existing keys stay with the other translation branch. */
export type GamesV2Overlay = Partial<Record<TranslationKey, string>>;

export const gamesV2Overlays: Record<Exclude<AppLocale, "ar" | "en">, GamesV2Overlay> = {
  fr: { "games.wheel.won": "Tu as gagné {value}" },
  es: { "games.wheel.won": "Has ganado {value}" },
  de: { "games.wheel.won": "Du gewinnst {value}" },
  pt: { "games.wheel.won": "Você ganhou {value}" },
  id: { "games.wheel.won": "Kamu mendapat {value}" },
  hi: { "games.wheel.won": "आपको {value} मिला" },
  ru: { "games.wheel.won": "Вам выпало {value}" },
  tr: { "games.wheel.won": "{value} kazandın" },
  "zh-CN": { "games.wheel.won": "你转到了 {value}" },
  ja: { "games.wheel.won": "{value} が出ました" },
  ko: { "games.wheel.won": "{value}이(가) 나왔습니다" },
};
