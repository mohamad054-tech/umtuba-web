"use client";

import { useTranslation } from "../../components/i18n";
import { localizedVideoTitle } from "../../watch/lib/mapWatchVideo";

type DiscoverCaptionProps = {
  title: string;
  caption: string;
  hashtags: string[];
  articleHref?: string | null;
  articleTitle?: string | null;
};

export default function DiscoverCaption({
  title,
  caption,
  hashtags,
  articleHref = null,
  articleTitle = null,
}: DiscoverCaptionProps) {
  const { t } = useTranslation();
  const untitled = t("video.untitled");
  const displayTitle = articleTitle || localizedVideoTitle(title, untitled);
  const displayCaption = localizedVideoTitle(caption, untitled);

  return (
    <div className="space-y-2">
      <p className="line-clamp-2 text-base font-black tracking-tight text-white">
        {displayTitle}
      </p>
      {articleHref && articleTitle ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
          Linked article
        </p>
      ) : null}
      {caption &&
      displayCaption !== displayTitle &&
      displayCaption !== articleTitle ? (
        <p className="line-clamp-2 text-sm leading-6 text-white/75">
          {displayCaption}
        </p>
      ) : null}
      {hashtags.length > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-bold text-sky-200/90">
          {hashtags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
