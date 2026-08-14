"use client";

import Link from "next/link";
import { useState } from "react";
import CreatePostModal from "../components/CreatePostModal";
import { APP_ROUTES } from "../lib/nav";

const OPTIONS = [
  {
    id: "video",
    href: APP_ROUTES.createVideo,
    title: "Video",
    description: "Upload a clip to Home and Watch.",
  },
  {
    id: "article",
    href: APP_ROUTES.createArticle,
    title: "Article",
    description: "Write a long-form article with an optional teaser.",
  },
] as const;

export default function CreateChooser() {
  const [postOpen, setPostOpen] = useState(false);

  return (
    <>
      <h1 className="text-3xl font-black tracking-tight">
        What do you want to create?
      </h1>
      <p className="mt-3 text-sm leading-7 text-white/55">
        Video, article, and text or image posts are supported. Pick one to
        continue.
      </p>

      <ul className="mt-8 grid gap-3">
        {OPTIONS.map((option) => (
          <li key={option.id}>
            <Link
              href={option.href}
              className="watch-focus-ring block rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <p className="text-lg font-black">{option.title}</p>
              <p className="mt-1 text-sm text-white/55">{option.description}</p>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setPostOpen(true)}
            className="watch-focus-ring w-full rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <p className="text-lg font-black">Text or image</p>
            <p className="mt-1 text-sm text-white/55">
              Publish a short post with optional photo.
            </p>
          </button>
        </li>
      </ul>

      <CreatePostModal open={postOpen} onClose={() => setPostOpen(false)} />
    </>
  );
}
