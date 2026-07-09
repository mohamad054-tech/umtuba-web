"use client";

import { useState } from "react";

export default function ActionBar() {
  const [likes, setLikes] = useState(125);

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={() => setLikes(likes + 1)}
        className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20"
      >
        ❤️ {likes}
      </button>

      <button className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
        💬 18
      </button>

      <button className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
        📤 Share
      </button>
    </div>
  );
}