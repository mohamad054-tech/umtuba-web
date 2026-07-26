import Link from "next/link";
import { notFound } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
  buildCreatorProfileHref,
} from "../../lib/nav";
import { getPublishedArticle } from "../../../lib/articles/articlesFoundation";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ articleId: string }> | { articleId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { articleId } = await Promise.resolve(params);
  const supabase = await createClient();
  const loaded = await getPublishedArticle(supabase, articleId);
  if (!loaded.ok) {
    return { title: "Article · UMTUBA" };
  }
  return { title: `${loaded.data.title} · UMTUBA` };
}

export default async function ArticlePage({ params }: PageProps) {
  const { articleId } = await Promise.resolve(params);
  const supabase = await createClient();
  const loaded = await getPublishedArticle(supabase, articleId);
  if (!loaded.ok) {
    notFound();
  }

  const article = loaded.data;
  const profileHref = article.authorUsername
    ? buildCreatorProfileHref({ username: article.authorUsername })
    : APP_ROUTES.home;

  return (
    <main
      className={`relative min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title="Article" subtitle="Full story" sticky />
      <article className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Article
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          {article.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/50">
          {article.authorUsername ? (
            <Link
              href={profileHref}
              className="font-bold text-sky-300 underline underline-offset-2"
            >
              @{article.authorUsername.replace(/^@/, "")}
            </Link>
          ) : null}
          {article.published_at ? (
            <time dateTime={article.published_at}>
              {new Date(article.published_at).toLocaleDateString()}
            </time>
          ) : null}
        </div>
        <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-white/80">
          {article.body}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={profileHref}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Open profile
          </Link>
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold"
          >
            Home feed
          </Link>
        </div>
      </article>
    </main>
  );
}
