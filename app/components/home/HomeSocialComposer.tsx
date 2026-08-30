"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n";
import CreatePostModal from "../CreatePostModal";
import type { DatabasePost } from "../../data/types/post";
import {
  HOME_SOCIAL_POSTED_EVENT,
  type HomeSocialPostedDetail,
} from "../../lib/social/homeSocialPost";
import HomeLatestPostLayer from "./HomeLatestPostLayer";

export default function HomeSocialComposer() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [imageIntent, setImageIntent] = useState(false);
  const [latestPost, setLatestPost] = useState<DatabasePost | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    function handlePosted(event: Event) {
      const detail = (event as CustomEvent<HomeSocialPostedDetail>).detail;
      if (!detail?.post) {
        return;
      }
      setLatestPost(detail.post);
      setToastVisible(true);
    }

    window.addEventListener(HOME_SOCIAL_POSTED_EVENT, handlePosted);
    return () => {
      window.removeEventListener(HOME_SOCIAL_POSTED_EVENT, handlePosted);
    };
  }, []);

  useEffect(() => {
    if (!toastVisible) {
      return;
    }
    const timer = window.setTimeout(() => setToastVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, [toastVisible]);

  const openComposer = useCallback((wantImage: boolean) => {
    setImageIntent(wantImage);
    setOpen(true);
  }, []);

  return (
    <div className="px-3 pb-2 pt-1 md:px-0">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-black/40 px-3 py-2.5 shadow-[0_0_24px_rgba(212,175,55,0.08)] backdrop-blur-md">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-gradient-to-br from-amber-300/20 to-amber-600/10 text-sm font-black text-amber-100"
          aria-hidden
        >
          UM
        </span>
        <button
          type="button"
          onClick={() => openComposer(false)}
          className="watch-focus-ring min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-start text-sm font-bold text-white/70 transition hover:border-amber-300/30 hover:bg-white/[0.07] hover:text-white"
        >
          {t("social.composer.prompt")}
        </button>
        <button
          type="button"
          onClick={() => openComposer(false)}
          className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/80 hover:bg-white/10 sm:inline-flex"
        >
          {t("social.composer.write")}
        </button>
        <button
          type="button"
          onClick={() => openComposer(true)}
          className="watch-focus-ring rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-50 hover:bg-amber-400/25"
        >
          {t("social.composer.photo")}
        </button>
      </div>

      {toastVisible && latestPost ? (
        <p
          className="mt-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-center text-xs font-bold text-emerald-100"
          role="status"
        >
          {t("social.latest.posted")}
        </p>
      ) : null}

      {latestPost ? (
        <HomeLatestPostLayer
          post={latestPost}
          onDismiss={() => {
            setLatestPost(null);
            setToastVisible(false);
          }}
        />
      ) : null}

      <CreatePostModal
        open={open}
        onClose={() => {
          setOpen(false);
          setImageIntent(false);
        }}
        preferImagePicker={imageIntent}
      />
    </div>
  );
}
