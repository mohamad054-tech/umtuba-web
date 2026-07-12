"use client";

import { useState } from "react";
import CreatePostModal from "./CreatePostModal";

export default function CreatePostButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-white px-5 py-2 font-black text-black transition hover:bg-white/90"
      >
        Create
      </button>

      <CreatePostModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}