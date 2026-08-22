"use client";

import type { ProfilePost } from "../types";
import { useTranslation } from "../../components/i18n";

type ProfilePostsPanelProps = {
  posts: ProfilePost[];
  loadFailed?: boolean;
};

export default function ProfilePostsPanel({
  posts,
  loadFailed = false,
}: ProfilePostsPanelProps) {
  const { t } = useTranslation();
  if (loadFailed) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      >
        Posts couldn&apos;t be loaded right now.
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-base font-bold text-white/80">{t("profile.emptyPosts")}</p>
        <p className="mt-2 text-sm text-white/45">
          Text and image posts from this creator will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li
          key={post.id}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            {post.postType}
          </p>
          {post.content ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
              {post.content}
            </p>
          ) : null}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt=""
              className="mt-3 max-h-72 w-full rounded-xl object-cover"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
