import type { Post } from "./types/post";

export type { Post, PostType, PostAuthor } from "./types/post";

export const posts: Post[] = [
  {
    id: 1,
    author: {
      name: "Lina Haddad",
      username: "@lina.creates",
      avatar: "LH",
    },
    type: "idea",
    content:
      "What if students could learn new skills by completing real community challenges?",
    likes: 248,
    comments: 39,
    shares: 18,
    createdAt: "12 min ago",
  },
  {
    id: 2,
    author: {
      name: "Omar Khalil",
      username: "@omar.travels",
      avatar: "OK",
    },
    type: "image",
    content:
      "A quiet morning, a new city, and a reminder that every journey starts with one small step.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    likes: 581,
    comments: 74,
    shares: 42,
    createdAt: "34 min ago",
  },
  {
    id: 3,
    author: {
      name: "Sara Ahmad",
      username: "@sara.builds",
      avatar: "SA",
    },
    type: "challenge",
    content:
      "7-day creativity challenge: create one useful idea every day and share your progress.",
    likes: 392,
    comments: 91,
    shares: 57,
    createdAt: "1 hr ago",
  },
];