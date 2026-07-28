/**
 * Content Card System V1 — typed view model.
 * Domains + registry remain authoritative; UI consumes this contract only.
 */

import type { ContentKind, ContentVisibility } from "../contentRegistry";

export type ContentCardCtaVerb =
  | "read_article"
  | "watch"
  | "start_course"
  | "view_product"
  | "join_live"
  | "view_photo"
  | "edit";

export type ContentCardBadgeId =
  | "linked_article"
  | "generated_teaser"
  | "independent_video"
  | "live"
  | "new"
  | "featured"
  | "updated"
  | "draft"
  | "premium"
  | "pinned";

export type ContentCardDiscoveryMode =
  | "none"
  | "teaser_bound"
  | "native_video"
  | "surface_promo";

export type ContentCardPresentationVariant =
  | "article"
  | "video"
  | "course"
  | "product"
  | "live"
  | "photo";

export type ContentCardLayoutVariant =
  | "feed"
  | "profile"
  | "search"
  | "related"
  | "featured"
  | "compact";

export type ContentCardCreator = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  verified?: boolean;
};

export type ContentCardPreview = {
  recipe: "image" | "video_still" | "gradient" | "none";
  src?: string | null;
  poster?: string | null;
  aspect: "16:9" | "9:16" | "1:1" | "auto";
  alt: string;
  gradientClass?: string;
  durationLabel?: string | null;
};

export type ContentCardCta = {
  verb: ContentCardCtaVerb;
  label: string;
  href: string;
};

export type ContentCardViewModel = {
  id: string;
  registryId: string;
  kind: ContentKind | string;
  sourceEntityId: string;
  creator: ContentCardCreator;
  title: string;
  summary: string | null;
  canonicalHref: string;
  publishedAt: string | null;
  visibility: ContentVisibility | string;
  publishState?: string;
  preview: ContentCardPreview;
  discoveryPostId: number | null;
  discoveryMode: ContentCardDiscoveryMode;
  hasGeneratedTeaser: boolean;
  featured?: boolean;
  pinned?: boolean;
  badges: ContentCardBadgeId[];
  cta: ContentCardCta;
  presentationVariant: ContentCardPresentationVariant;
  layoutVariant?: ContentCardLayoutVariant;
};

export const FUTURE_CONTENT_CARD_KINDS = [
  "course",
  "product",
  "photo",
  "live",
] as const;

export function ctaLabelForVerb(
  verb: ContentCardCtaVerb,
  dir: "rtl" | "ltr" = "ltr"
): string {
  const ar: Record<ContentCardCtaVerb, string> = {
    read_article: "اقرأ المقال",
    watch: "شاهد",
    start_course: "ابدأ الدورة",
    view_product: "عرض المنتج",
    join_live: "انضم للبث",
    view_photo: "عرض",
    edit: "تعديل",
  };
  const en: Record<ContentCardCtaVerb, string> = {
    read_article: "Read article",
    watch: "Watch",
    start_course: "Start course",
    view_product: "View product",
    join_live: "Join live",
    view_photo: "View",
    edit: "Edit",
  };
  return dir === "rtl" ? ar[verb] : en[verb];
}

export function badgeLabel(
  badge: ContentCardBadgeId,
  dir: "rtl" | "ltr" = "ltr"
): string {
  const ar: Record<ContentCardBadgeId, string> = {
    linked_article: "مقال مرتبط",
    generated_teaser: "تيزر مولّد",
    independent_video: "فيديو مستقل",
    live: "مباشر",
    new: "جديد",
    featured: "مميز",
    updated: "محدّث",
    draft: "مسودة",
    premium: "مميز مدفوع",
    pinned: "مثبت",
  };
  const en: Record<ContentCardBadgeId, string> = {
    linked_article: "Linked article",
    generated_teaser: "Generated teaser",
    independent_video: "Independent video",
    live: "Live",
    new: "New",
    featured: "Featured",
    updated: "Updated",
    draft: "Draft",
    premium: "Premium",
    pinned: "Pinned",
  };
  return dir === "rtl" ? ar[badge] : en[badge];
}

export function detectTextDir(text: string): "rtl" | "ltr" {
  return /[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr";
}

export function kindLabel(kind: string, dir: "rtl" | "ltr" = "ltr"): string {
  const map: Record<string, { ar: string; en: string }> = {
    article: { ar: "مقالة", en: "Article" },
    video: { ar: "فيديو", en: "Video" },
    course: { ar: "دورة", en: "Course" },
    product: { ar: "منتج", en: "Product" },
    live: { ar: "بث", en: "Live" },
    photo: { ar: "صورة", en: "Photo" },
  };
  const entry = map[kind];
  if (!entry) return kind;
  return dir === "rtl" ? entry.ar : entry.en;
}
