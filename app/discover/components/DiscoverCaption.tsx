"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import { APP_ROUTES } from "../../lib/nav";

type DiscoverCaptionProps = {
  title: string;
  caption: string;
  hashtags: string[];
  articleHref?: string | null;
  articleTitle?: string | null;
  postId?: string | number | null;
  createdAt?: string | null;
};

function formatPostTimestamp(iso: string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) {
    return "";
  }
  const minutes = Math.floor((Date.now() - created) / 60000);
  if (minutes < 1) {
    return "·";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

export default function DiscoverCaption({
  title,
  caption,
  hashtags,
  articleHref = null,
  articleTitle = null,
  postId = null,
  createdAt = null,
}: DiscoverCaptionProps) {
  const { t } = useTranslation();
  const postHref =
    postId != null && String(postId).length > 0
      ? `${APP_ROUTES.home}?post=${postId}`
      : null;
  const stamp = createdAt ? formatPostTimestamp(createdAt) : "";

  return (
    <div className="space-y-2">
      <p className="line-clamp-2 text-base font-black tracking-tight text-white" dir="auto">
        {articleTitle || title}
      </p>
      {articleHref && articleTitle ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
          {t("social.caption.linkedArticle")}
        </p>
      ) : null}
      {caption && caption !== title && caption !== articleTitle ? (
        <p className="line-clamp-2 text-sm leading-6 text-white/75" dir="auto">
          {caption}
        </p>
      ) : null}
      {hashtags.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-bold text-sky-200/90">
          {hashtags.map((tag) => (
            <span key={tag} dir="auto">
              {tag}
            </span>
          ))}
        </p>
      ) : null}
      {postHref && stamp ? (
        <Link
          href={postHref}
          className="pointer-events-auto inline-flex text-[11px] font-bold text-white/45 hover:text-white/75"
        >
          {stamp}
        </Link>
      ) : null}
    </div>
  );
}
