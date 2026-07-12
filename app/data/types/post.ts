export type PostType =
  | "text"
  | "image"
  | "video"
  | "poll"
  | "question"
  | "challenge"
  | "idea"
  | "opportunity";

export type PostAuthor = {
  name: string;
  username: string;
  avatar: string;
};

export type Post = {
  id: number;
  author: PostAuthor;
  type: PostType;
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
};

export type DatabasePost = {
  id: number;
  user_id: string | null;
  content: string;
  post_type: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  image_url: string | null;
  video_url: string | null;
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
};