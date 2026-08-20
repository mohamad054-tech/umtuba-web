"use client";

import Link from "next/link";
import { useState } from "react";
import AppTopNav from "../components/AppTopNav";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import { useTranslation } from "../components/i18n";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import LifePostCard from "./LifePostCard";
import type { LifePost } from "./lib/lifePosts";

type LifeExperienceProps = {
  initialPosts: LifePost[];
  focusedPost?: LifePost | null;
  loadError?: string | null;
  focusedMissing?: boolean;
};

export default function LifeExperience({
  initialPosts,
  focusedPost = null,
  loadError = null,
  focusedMissing = false,
}: LifeExperienceProps) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState(initialPosts);
  const [focused, setFocused] = useState(focusedPost);

  function handleChange(postId: number, patch: Partial<LifePost>) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post))
    );
    setFocused((current) =>
      current && current.id === postId ? { ...current, ...patch } : current
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <AppTopNav
        title={t("life.title")}
        subtitle={t("life.subtitle")}
        actions={
          <Link
            href={APP_ROUTES.lifeCompose}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
          >
            {t("life.composeNav")}
          </Link>
        }
      />

      <div className="mx-auto w-full min-w-0 max-w-[45rem] px-4 py-6 sm:px-6 md:py-8">
        {focused || focusedMissing ? (
          <div className="mb-5">
            <Link
              href={APP_ROUTES.life}
              className="watch-focus-ring text-sm font-bold text-white/65 underline-offset-2 hover:text-white hover:underline"
            >
              {t("life.backToFeed")}
            </Link>
          </div>
        ) : null}

        {loadError ? (
          <ProductErrorState
            title={t("life.unavailableTitle")}
            message={sanitizeUserFacingMessage(
              loadError,
              t("life.unavailableBody")
            )}
            onRetry={() => {
              window.location.assign(
                focused?.id
                  ? `${APP_ROUTES.life}?post=${focused.id}`
                  : APP_ROUTES.life
              );
            }}
          />
        ) : focusedMissing ? (
          <ProductEmptyState
            compact
            eyebrow={t("life.title")}
            title={t("life.unavailableTitle")}
            description={t("life.unavailableBody")}
            primaryHref={APP_ROUTES.life}
            primaryLabel={t("life.backToFeed")}
            secondaryHref={null}
            secondaryLabel={null}
          />
        ) : focused ? (
          <section aria-label={t("life.focusedAria")}>
            <LifePostCard
              post={focused}
              focused
              onChange={handleChange}
            />
          </section>
        ) : posts.length > 0 ? (
          <section aria-label={t("life.feedAria")} className="space-y-5">
            {posts.map((post) => (
              <LifePostCard
                key={post.id}
                post={post}
                onChange={handleChange}
              />
            ))}
          </section>
        ) : (
          <ProductEmptyState
            compact
            eyebrow={t("life.title")}
            title={t("life.emptyTitle")}
            description={t("life.emptyBody")}
            primaryHref={APP_ROUTES.createPost}
            primaryLabel={t("create.title")}
            secondaryHref={APP_ROUTES.home}
            secondaryLabel={t("nav.home")}
          />
        )}
      </div>
    </div>
  );
}
