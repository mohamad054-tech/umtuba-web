import type { FoundationMessages } from "./types";

/** English copy for home-chrome labels. Locales without a translation keep these. */
export const homeChromeEnglishFallback = {
  "nav.sections": "Sections",
  "nav.me": "Me",
  "nav.quran": "The Quran",
  "nav.store": "Store",
  "nav.games": "Games",
  "nav.rewards": "Rewards",
  "nav.side": "Main menu",
  "home.caption.more": "more",
  "home.link.explore": "Explore",
  "sections.about": "About UMTUBA",
  "sections.support": "Support",
  "sections.legalAria": "About and policies",
  "feed.gameBreak.title": "Game break",
  "feed.gameBreak.round": "A short round",
  "feed.gameBreak.play": "Play now",
  "feed.gameBreak.swipe": "Swipe up to continue",
} as const satisfies Pick<
  FoundationMessages,
  | "nav.sections"
  | "nav.me"
  | "nav.quran"
  | "nav.store"
  | "nav.games"
  | "nav.rewards"
  | "nav.side"
  | "home.caption.more"
  | "home.link.explore"
  | "sections.about"
  | "sections.support"
  | "sections.legalAria"
  | "feed.gameBreak.title"
  | "feed.gameBreak.round"
  | "feed.gameBreak.play"
  | "feed.gameBreak.swipe"
>;
