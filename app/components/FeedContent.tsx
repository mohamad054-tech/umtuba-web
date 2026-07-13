"use client";

import { useCallback, useEffect, useState } from "react";
import ContentCard from "./ContentCard";
import { loadFeedPostsAction } from "../actions/loadPosts";
import type { PublicPostDTO } from "../../lib/supabase/videoPosts";
import type { Post, PostType } from "../data/types/post";

type FilterOption = {
  label: string;
  type: PostType | "all";
};

const filters: FilterOption[] = [
  { label: "All", type: "all" },
  { label: "Images", type: "image" },
  { label: "Videos", type: "video" },
  { label: "Polls", type: "poll" },
  { label: "Questions", type: "question" },
  { label: "Challenges", type: "challenge" },
  { label: "Ideas", type: "idea" },
  { label: "Opportunities", type: "opportunity" },
];

const validPostTypes: PostType[] = [
  "text",
  "image",
  "video",
  "poll",
  "question",
  "challenge",
  "idea",
  "opportunity",
];

function formatCreatedAt(createdAt: string) {
  const createdDate = new Date(createdAt);
  const now = new Date();

  const differenceInMinutes = Math.floor(
    (now.getTime() - createdDate.getTime()) / 60000
  );

  if (differenceInMinutes < 1) {
    return "Just now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} min ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  if (differenceInHours < 24) {
    return `${differenceInHours} hr ago`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);

  return `${differenceInDays} day${differenceInDays === 1 ? "" : "s"} ago`;
}

function convertFeedPost(databasePost: PublicPostDTO): Post {
  const postType = validPostTypes.includes(databasePost.post_type as PostType)
    ? (databasePost.post_type as PostType)
    : "text";

  return {
    id: databasePost.id,
    author: {
      name: databasePost.author_name,
      username: databasePost.author_username,
      avatar: databasePost.author_avatar,
    },
    type: postType,
    content: databasePost.content,
    image: databasePost.image_url ?? undefined,
    video: databasePost.video_url ?? undefined,
    likes: databasePost.likes,
    comments: databasePost.comments,
    shares: databasePost.shares,
    saves: databasePost.saves,
    views: databasePost.views,
    likedByMe: databasePost.likedByMe,
    savedByMe: databasePost.savedByMe,
    createdAt: formatCreatedAt(databasePost.created_at),
  };
}

export default function FeedContent() {
  const [activeFilter, setActiveFilter] = useState<PostType | "all">("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await loadFeedPostsAction();

      if (!result.ok) {
        setErrorMessage(result.message);
        setPosts([]);
        return;
      }

      setPosts(result.posts.map(convertFeedPost));
    } catch (error) {
      console.error(error);
      setErrorMessage("Posts could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (cancelled) {
        return;
      }

      await loadPosts();
    }

    void initialLoad();

    function handlePostCreated() {
      void loadPosts();
    }

    window.addEventListener("umtuba:post-created", handlePostCreated);

    return () => {
      cancelled = true;
      window.removeEventListener("umtuba:post-created", handlePostCreated);
    };
  }, [loadPosts]);

  const filteredPosts =
    activeFilter === "all"
      ? posts
      : posts.filter((post) => post.type === activeFilter);

  function handlePostChange(postId: number, patch: Partial<Post>) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post))
    );
  }

  return (
    <>
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.type;

          return (
            <button
              key={filter.type}
              type="button"
              onClick={() => setActiveFilter(filter.type)}
              className={`shrink-0 rounded-full border px-5 py-3 font-bold transition ${
                isActive
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-[30px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-xl font-black">Loading posts...</p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-[30px] border border-red-400/20 bg-red-400/5 px-6 py-16 text-center">
          <p className="text-xl font-black text-red-300">{errorMessage}</p>
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredPosts.map((post) => (
            <ContentCard
              key={post.id}
              post={post}
              onPostChange={handlePostChange}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[30px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-2xl font-black">No posts yet</p>

          <p className="mt-3 text-white/50">
            New content in this category will appear here.
          </p>
        </div>
      )}
    </>
  );
}
