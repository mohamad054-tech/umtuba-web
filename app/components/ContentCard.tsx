import type { Post } from "../data/posts";

type ContentCardProps = {
  post: Post;
};

const postTypeLabels: Record<Post["type"], string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  poll: "Poll",
  question: "Question",
  challenge: "Challenge",
  idea: "Idea",
  opportunity: "Opportunity",
};

export default function ContentCard({ post }: ContentCardProps) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-black text-black">
            {post.author.avatar}
          </div>

          <div className="min-w-0">
            <p className="truncate font-black">{post.author.name}</p>
            <p className="truncate text-sm text-white/50">
              {post.author.username} · {post.createdAt}
            </p>
          </div>

          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/70">
            {postTypeLabels[post.type]}
          </span>
        </div>

        <p className="mt-5 text-lg leading-8 text-white/90">
          {post.content}
        </p>
      </div>

      {post.image && (
        <img
          src={post.image}
          alt={post.content}
          className="h-72 w-full object-cover"
        />
      )}

      {post.video && (
        <div className="flex h-72 items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-black">
              ▶
            </div>
            <p className="font-black">Play video</p>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 p-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <button className="rounded-2xl bg-white/5 px-3 py-3 font-bold hover:bg-white/10">
            ❤️ {post.likes}
          </button>

          <button className="rounded-2xl bg-white/5 px-3 py-3 font-bold hover:bg-white/10">
            💬 {post.comments}
          </button>

          <button className="rounded-2xl bg-white/5 px-3 py-3 font-bold hover:bg-white/10">
            ↗️ {post.shares}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <button className="rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10">
            🤝 UConnect
          </button>

          <button className="rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10">
            🔖 Save
          </button>
        </div>
      </div>
    </article>
  );
}