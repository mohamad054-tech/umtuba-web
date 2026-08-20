import type { PublicPostDTO } from "../../../lib/supabase/videoPosts";

export const LIFE_POST_TYPES = ["text", "image", "video"] as const;

export type LifePostType = (typeof LIFE_POST_TYPES)[number];

export type LifePost = {
  id: number;
  ownerUserId: string | null;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  type: LifePostType;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  likedByMe: boolean;
  savedByMe: boolean;
  createdAt: string;
};

export function isLifePostType(value: string): value is LifePostType {
  return (LIFE_POST_TYPES as readonly string[]).includes(value);
}

export function mapPublicPostToLifePost(post: PublicPostDTO): LifePost | null {
  if (!isLifePostType(post.post_type)) {
    return null;
  }

  return {
    id: post.id,
    ownerUserId: post.user_id,
    author: {
      name: post.author_name,
      username: post.author_username,
      avatar: post.author_avatar,
    },
    type: post.post_type,
    content: post.content ?? "",
    imageUrl: post.image_url,
    videoUrl: post.video_url,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    saves: post.saves,
    views: post.views,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    createdAt: post.created_at,
  };
}

export function formatLifeTimestamp(iso: string): string {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) {
    return "";
  }

  const minutes = Math.floor((Date.now() - created) / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(created));
}
