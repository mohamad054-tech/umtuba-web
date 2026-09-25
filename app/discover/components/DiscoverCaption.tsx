"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "../../components/i18n";
import VideoViewCountStat from "../../components/video/VideoViewCountStat";

type DiscoverCaptionProps = {
  title: string;
  caption: string;
  hashtags: string[];
  articleHref?: string | null;
  articleTitle?: string | null;
  views: number;
};

export default function DiscoverCaption({
  caption,
  articleHref = null,
  views,
}: DiscoverCaptionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const untitled = t("video.untitled");
  const text = caption.trim();
  const shown = text || untitled;
  const moreOpensArticle = Boolean(articleHref);

  return (
    <div className="pointer-events-auto space-y-1 text-start">
      <p className={`${expanded ? "" : "line-clamp-2"} text-sm leading-5 text-white/95`}>
        {shown}
      </p>
      {text && (!expanded || moreOpensArticle) ? (
        <button
          type="button"
          className="text-xs font-black text-[#f0a93b]"
          onClick={() => {
            if (articleHref) {
              router.push(articleHref);
              return;
            }
            setExpanded(true);
          }}
        >
          {t("home.caption.more")}
        </button>
      ) : null}
      <VideoViewCountStat views={views} variant="caption" />
    </div>
  );
}
