"use client";

import { useState } from "react";
import ContentCard from "../components/ContentCard";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import type { Post } from "../data/types/post";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";

type SavedExperienceProps = {
  initialPosts: Post[];
  loadError?: string | null;
};

export default function SavedExperience({
  initialPosts,
  loadError = null,
}: SavedExperienceProps) {
  const [posts, setPosts] = useState(initialPosts);

  function handlePostChange(postId: number, patch: Partial<Post>) {
    setPosts((current) => {
      const next = current.map((post) =>
        post.id === postId ? { ...post, ...patch } : post
      );

      if (patch.savedByMe === false) {
        return next.filter((post) => post.id !== postId);
      }

      return next;
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
          Your collection
        </p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Saved posts</h1>
        <p className="mt-4 max-w-2xl text-white/60">
          Posts you bookmark appear here. Unsave anytime from the post card.
        </p>
      </div>

      {loadError ? (
        <div className="flex justify-center">
          <ProductErrorState
            title="Couldn’t load saved posts"
            message={sanitizeUserFacingMessage(loadError)}
            onRetry={() => {
              window.location.assign(APP_ROUTES.saved);
            }}
          />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <ContentCard
              key={post.id}
              post={post}
              onPostChange={handlePostChange}
            />
          ))}
        </div>
      ) : (
        <div className="flex justify-center">
          <ProductEmptyState
            compact
            eyebrow="Saved"
            title="No saved posts yet"
            description="Tap Save on Discover or Watch posts to build your collection."
            primaryHref={APP_ROUTES.discover}
            primaryLabel="Go to Discover"
            secondaryHref={null}
            secondaryLabel={null}
          />
        </div>
      )}
    </div>
  );
}
