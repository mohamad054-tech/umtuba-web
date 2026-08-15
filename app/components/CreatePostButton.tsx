"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_ROUTES } from "../lib/nav";
import CreatePostModal from "./CreatePostModal";

export default function CreatePostButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={APP_ROUTES.createVideo}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-bold text-white transition hover:bg-white/10"
        >
          Video
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-white px-5 py-2 font-black text-black transition hover:bg-white/90"
        >
          Write Post
        </button>
      </div>

      <CreatePostModal open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
