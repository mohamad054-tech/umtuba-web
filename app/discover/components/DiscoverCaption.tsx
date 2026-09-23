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
  articleTitle = null,
}: DiscoverCaptionProps) {
  const { t } = useTranslation();
  const untitled = t("video.untitled");
  const displayTitle = articleTitle || localizedVideoTitle(title, untitled);

  return (
    <p className="truncate text-sm font-black tracking-tight text-white">
      {displayTitle}
    </p>
  );
}
