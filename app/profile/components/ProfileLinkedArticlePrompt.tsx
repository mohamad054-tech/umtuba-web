"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildArticleHref } from "../../lib/nav";

type ProfileLinkedArticlePromptProps = {
  articleId: string;
  articleTitle?: string | null;
  username: string;
};

/**
 * Shown only when arriving from a video teaser with ?article=.
 * Read now → dedicated article route; Browse → dismiss and stay on profile.
 */
export default function ProfileLinkedArticlePrompt({
  articleId,
  articleTitle = null,
  username,
}: ProfileLinkedArticlePromptProps) {
  const router = useRouter();

  function browseProfile() {
    router.replace(`/profile/${username.replace(/^@/, "").toLowerCase()}`, {
      scroll: false,
    });
  }

  return (
    <div
      role="dialog"
      aria-label="Linked article"
      className="rounded-2xl border border-sky-300/25 bg-sky-500/10 px-4 py-4 backdrop-blur-sm"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/80">
        Linked article
      </p>
      <p className="mt-2 text-sm font-bold text-white">
        This video is linked to a full article. Open it now, or keep browsing
        the profile.
      </p>
      {articleTitle ? (
        <p className="mt-1 line-clamp-2 text-sm text-white/60">{articleTitle}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildArticleHref(articleId)}
          className="watch-focus-ring rounded-full bg-white px-4 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
        >
          Read article now
        </Link>
        <button
          type="button"
          onClick={browseProfile}
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10"
        >
          Browse profile
        </button>
      </div>
    </div>
  );
}
