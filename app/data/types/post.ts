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
  ownerUserId?: string | null;
  author: PostAuthor;
  type: PostType;
  content: string;
  image?: string;
  video?: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  likedByMe: boolean;
  savedByMe: boolean;
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
  /** Signed or legacy playback URL resolved at read time. */
  video_url: string | null;
  /** Private storage object path in the post-videos bucket. */
  video_path?: string | null;
  video_mime_type?: string | null;
  video_byte_size?: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  views?: number;
  created_at: string;
};