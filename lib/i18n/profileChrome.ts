import type { ActivityTierId } from "../activity-tiers";
import type { ProfileTabId } from "../../app/profile/lib/profileTabs";
import { formatDate } from "./format";
import type { AppLocale } from "./locales";
import type { TranslationKey } from "./messages/types";
import type { TranslateOptions } from "./translate";

export const PROFILE_TAB_I18N_KEYS: Record<ProfileTabId, TranslationKey> = {
  all: "profile.all",
  posts: "profile.posts",
  articles: "profile.articles",
  videos: "profile.videos",
  courses: "profile.courses",
  products: "profile.products",
  photos: "profile.photos",
  live: "profile.live",
  about: "profile.about",
};

export const LIVE_BUCKET_I18N_KEYS = {
  now: "profile.liveNow",
  upcoming: "profile.liveUpcoming",
  past: "profile.livePast",
} as const;

export const CARD_KIND_I18N_KEYS = {
  article: "card.kind.article",
  video: "card.kind.video",
  course: "card.kind.course",
  product: "card.kind.product",
  live: "card.kind.live",
  photo: "card.kind.photo",
} as const;

export const CARD_BADGE_I18N_KEYS = {
  linked_article: "card.badge.linked_article",
  generated_teaser: "card.badge.generated_teaser",
  independent_video: "card.badge.independent_video",
  live: "card.badge.live",
  new: "card.badge.new",
  featured: "card.badge.featured",
  updated: "card.badge.updated",
  draft: "card.badge.draft",
  premium: "card.badge.premium",
  pinned: "card.badge.pinned",
} as const;

export const PROFILE_CERT_KEYS = [
  "profile.creatorSpace",
  "profile.creatorHub",
  "profile.activityTier",
  "profile.tierTitle.rising",
  "profile.activityScore",
  "profile.progressTo",
  "profile.progressExplanation",
  "profile.joinedDate",
  "profile.share",
  "profile.about",
  "profile.photos",
  "profile.videos",
  "profile.posts",
  "profile.all",
] as const satisfies readonly TranslationKey[];

export function activityTierTitleKey(id: ActivityTierId): TranslationKey {
  switch (id) {
    case "spark":
      return "profile.tierTitle.spark";
    case "rising":
      return "profile.tierTitle.rising";
    case "creator":
      return "profile.tierTitle.creator";
    case "pathfinder":
      return "profile.tierTitle.pathfinder";
    case "luminary":
      return "profile.tierTitle.luminary";
    case "icon":
      return "profile.tierTitle.icon";
    default:
      return "profile.tierTitle.spark";
  }
}

export function activityTierLabelKey(id: ActivityTierId): TranslationKey {
  switch (id) {
    case "spark":
      return "profile.tierLabel.spark";
    case "rising":
      return "profile.tierLabel.rising";
    case "creator":
      return "profile.tierLabel.creator";
    case "pathfinder":
      return "profile.tierLabel.pathfinder";
    case "luminary":
      return "profile.tierLabel.luminary";
    case "icon":
      return "profile.tierLabel.icon";
    default:
      return "profile.tierLabel.spark";
  }
}

type Translator = (key: TranslationKey, options?: TranslateOptions) => string;

function stripJoinedPrefix(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  return value.replace(/^joined\s+/i, "").trim();
}

function parseJoinedDatePart(datePart: string): Date | null {
  const direct = new Date(datePart);
  if (!Number.isNaN(direct.getTime()) && /\d{4}/.test(datePart)) {
    return direct;
  }
  const withDay = new Date(`1 ${datePart}`);
  if (!Number.isNaN(withDay.getTime()) && /\d{4}/.test(datePart)) {
    return withDay;
  }
  return null;
}

export function formatLocalizedJoinedLine(
  locale: AppLocale,
  t: Translator,
  input: { joinedAt?: string | null; joinedLabel?: string | null }
): string | null {
  if (input.joinedAt) {
    const date = formatDate(locale, input.joinedAt, {
      month: "long",
      year: "numeric",
    });
    if (date) {
      return t("profile.joinedDate", { values: { date } });
    }
  }

  const datePart = stripJoinedPrefix(input.joinedLabel);
  if (!datePart) {
    return null;
  }
  if (/recently/i.test(datePart)) {
    return t("profile.joinedRecently");
  }
  const parsed = parseJoinedDatePart(datePart);
  if (parsed) {
    const date = formatDate(locale, parsed, {
      month: "long",
      year: "numeric",
    });
    if (date) {
      return t("profile.joinedDate", { values: { date } });
    }
  }
  return t("profile.joinedDate", { values: { date: datePart } });
}

export function formatLocalizedJoinedBody(
  locale: AppLocale,
  t: Translator,
  input: { joinedAt?: string | null; joinedLabel?: string | null }
): string | null {
  if (input.joinedAt) {
    const date = formatDate(locale, input.joinedAt, {
      month: "long",
      year: "numeric",
    });
    return date || null;
  }
  const datePart = stripJoinedPrefix(input.joinedLabel);
  if (!datePart) {
    return null;
  }
  if (/recently/i.test(datePart)) {
    return t("profile.joinedRecently");
  }
  const parsed = parseJoinedDatePart(datePart);
  if (parsed) {
    return (
      formatDate(locale, parsed, { month: "long", year: "numeric" }) || datePart
    );
  }
  return datePart;
}
