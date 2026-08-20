"use client";

import Link from "next/link";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildLifePostHref,
} from "../lib/nav";
import { useTranslation } from "../components/i18n";
import LifeEngagementBar from "./LifeEngagementBar";
import { formatLifeTimestamp, type LifePost } from "./lib/lifePosts";

type LifePostCardProps = {
  post: LifePost;
  focused?: boolean;
  onChange: (postId: number, patch: Partial<LifePost>) => void;
};

export default function LifePostCard({
  post,
  focused = false,
  onChange,
}: LifePostCardProps) {
  const { t } = useTranslation();
  const profileHref = post.author.username
    ? buildCreatorProfileHref({ username: post.author.username })
    : APP_ROUTES.profile;
  const focusedHref = buildLifePostHref(post.id);
  const watchHref = `${APP_ROUTES.watch}?post=${post.id}`;
  const authorAria = t("life.authorProfileAria", {
    values: { name: post.author.name || post.author.username },
  });

  return (
    <article
      className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]"
      aria-label={focused ? t("life.focusedAria") : undefined}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Link
            href={profileHref}
            className="watch-focus-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-black text-black"
            aria-label={authorAria}
          >
            {post.author.avatar}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link
                href={profileHref}
                className="watch-focus-ring truncate text-base font-black hover:text-white/85"
              >
                {post.author.name}
              </Link>
              <Link
                href={profileHref}
                className="watch-focus-ring truncate text-sm text-white/50"
              >
                @{post.author.username}
              </Link>
            </div>
            <p className="text-xs text-white/40">
              <time dateTime={post.createdAt}>
                {formatLifeTimestamp(post.createdAt)}
              </time>
            </p>
          </div>
        </div>

        {post.content ? (
          focused ? (
            <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-white/90">
              {post.content}
            </p>
          ) : (
            <Link href={focusedHref} className="watch-focus-ring mt-5 block">
              <p className="line-clamp-8 whitespace-pre-wrap text-base leading-7 text-white/90">
                {post.content}
              </p>
            </Link>
          )
        ) : null}
      </div>

      {post.imageUrl ? (
        focused ? (
          <img
            src={post.imageUrl}
            alt=""
            className="max-h-[36rem] w-full bg-black object-contain"
          />
        ) : (
          <Link href={focusedHref} className="block">
            <img
              src={post.imageUrl}
              alt=""
              className="h-72 w-full object-cover"
            />
          </Link>
        )
      ) : null}

      {post.videoUrl ? (
        <div className="bg-black">
          <video
            src={post.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-[36rem] w-full bg-black"
          />
          {focused ? (
            <div className="border-t border-white/10 px-5 py-3">
              <Link
                href={watchHref}
                className="watch-focus-ring text-sm font-bold text-white/70 underline-offset-2 hover:text-white hover:underline"
              >
                {t("life.watchVideo")}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative border-t border-white/10 p-5">
        <LifeEngagementBar
          post={post}
          commentsVariant={focused ? "inline" : "sheet"}
          onChange={onChange}
        />
      </div>
    </article>
  );
}
