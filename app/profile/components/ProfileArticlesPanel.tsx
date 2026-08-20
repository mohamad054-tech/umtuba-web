import Link from "next/link";
import type { ProfileArticle } from "../types";
import { PROFILE_ERROR_STATES_COPY } from "../lib/profileErrorStates";
import ProfilePanelError from "./ProfilePanelError";

type ProfileArticlesPanelProps = {
  articles: ProfileArticle[];
  loadFailed?: boolean;
  onRetry?: () => void;
  isOwner?: boolean;
};

export default function ProfileArticlesPanel({
  articles,
  loadFailed = false,
  onRetry,
  isOwner = false,
}: ProfileArticlesPanelProps) {
  if (loadFailed) {
    return (
      <ProfilePanelError
        message={PROFILE_ERROR_STATES_COPY.articlesPanel}
        onRetry={onRetry}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-base font-bold text-white/80">No articles yet</p>
        <p className="mt-2 text-sm text-white/45">
          {isOwner
            ? "Publish an article to show it here. You can attach a short teaser video for the Home feed."
            : "This creator has not published articles yet."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {articles.map((article) => (
        <li key={article.id}>
          <Link
            href={article.href}
            className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/25"
          >
            <h3 className="text-base font-black text-white">{article.title}</h3>
            {article.excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm text-white/55">
                {article.excerpt}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
