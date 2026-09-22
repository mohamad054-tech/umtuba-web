import type { AppLocale } from "../locales";
import type { TranslationKey } from "./types";

/** New game strings only. Existing keys stay with the other translation branch. */
export type GamesV2Overlay = Partial<Record<TranslationKey, string>>;

export const gamesV2Overlays: Record<Exclude<AppLocale, "ar" | "en">, GamesV2Overlay> = {
  fr: {
    "games.wheel.won": "Tu as gagné {value}",
    "games.madeUpPrices": "Prix inventés. Ce n'est qu'un jeu.",
    "games.mute": "Couper le son",
    "games.unmute": "Son",
  },
  es: {
    "games.wheel.won": "Has ganado {value}",
    "games.madeUpPrices": "Precios inventados. Esto es solo un juego.",
    "games.mute": "Silenciar",
    "games.unmute": "Sonido",
  },
  de: {
    "games.wheel.won": "Du gewinnst {value}",
    "games.madeUpPrices": "Erfundene Preise. Das ist nur ein Spiel.",
    "games.mute": "Ton aus",
    "games.unmute": "Ton an",
  },
  pt: {
    "games.wheel.won": "Você ganhou {value}",
    "games.madeUpPrices": "Preços inventados. Isto é só um jogo.",
    "games.mute": "Silenciar",
    "games.unmute": "Som",
  },
  id: {
    "games.wheel.won": "Kamu mendapat {value}",
    "games.madeUpPrices": "Harga karangan. Ini hanya permainan.",
    "games.mute": "Bisukan",
    "games.unmute": "Suara",
  },
  hi: {
    "games.wheel.won": "आपको {value} मिला",
    "games.madeUpPrices": "काल्पनिक कीमतें. यह सिर्फ़ एक खेल है.",
    "games.mute": "आवाज़ बंद",
    "games.unmute": "आवाज़",
  },
  ru: {
    "games.wheel.won": "Вам выпало {value}",
    "games.madeUpPrices": "Цены выдуманы. Это только игра.",
    "games.mute": "Без звука",
    "games.unmute": "Звук",
  },
  tr: {
    "games.wheel.won": "{value} kazandın",
    "games.madeUpPrices": "Uydurma fiyatlar. Bu sadece bir oyun.",
    "games.mute": "Sesi kapat",
    "games.unmute": "Ses",
  },
  "zh-CN": {
    "games.wheel.won": "你转到了 {value}",
    "games.madeUpPrices": "价格是编的。这只是游戏。",
    "games.mute": "静音",
    "games.unmute": "声音",
  },
  ja: {
    "games.wheel.won": "{value} が出ました",
    "games.madeUpPrices": "価格は架空です。これはゲームです。",
    "games.mute": "消音",
    "games.unmute": "音声",
  },
  ko: {
    "games.wheel.won": "{value}이(가) 나왔습니다",
    "games.madeUpPrices": "가격은 꾸민 것입니다. 이것은 게임입니다.",
    "games.mute": "음소거",
    "games.unmute": "소리",
  },
};
