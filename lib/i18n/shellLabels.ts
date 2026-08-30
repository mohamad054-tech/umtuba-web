import type { TranslationKey } from "./messages/types";

/** Stable path → label key map (mirrors APP_ROUTES; no app-layer import). */
const DESKTOP_NAV_KEYS: Record<string, TranslationKey> = {
  "/": "nav.umLife",
  "/discover": "nav.discover",
  "/life": "nav.umLife",
  "/watch": "nav.watch",
  "/create/video": "nav.create",
  "/world": "nav.world",
  "/learning": "nav.learning",
  "/store": "nav.store",
  "/live": "nav.live",
  "/messages": "nav.messages",
};

const MOBILE_NAV_KEYS: Record<string, TranslationKey> = {
  home: "nav.home",
  umLife: "nav.umLife",
  watch: "nav.watch",
  create: "nav.create",
  learning: "nav.learning",
  store: "nav.store",
  discover: "nav.discover",
  live: "nav.live",
  messages: "nav.messages",
  profile: "nav.profile",
};

const USER_MENU_ITEM_KEYS: Record<string, TranslationKey> = {
  profile: "menu.profile",
  create: "menu.create",
  saved: "menu.saved",
  learning: "menu.learning",
  instructor: "menu.instructor",
  rewards: "menu.rewards",
  notifications: "menu.notifications",
  messages: "menu.messages",
  settings: "menu.settings",
  store: "menu.store",
  seller: "menu.seller",
  wishlist: "menu.wishlist",
  advertise: "menu.advertise",
  "admin-ads": "menu.admin",
};

const USER_MENU_GROUP_KEYS: Record<string, TranslationKey> = {
  you: "menu.you",
  account: "menu.account",
};

export function desktopNavLabelKey(href: string): TranslationKey {
  return DESKTOP_NAV_KEYS[href] ?? "nav.home";
}

export function mobileNavLabelKey(id: string): TranslationKey {
  return MOBILE_NAV_KEYS[id] ?? "nav.home";
}

export function userMenuItemLabelKey(id: string): TranslationKey {
  return USER_MENU_ITEM_KEYS[id] ?? "menu.profile";
}

export function userMenuGroupLabelKey(id: string): TranslationKey {
  return USER_MENU_GROUP_KEYS[id] ?? "menu.account";
}
