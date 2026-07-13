import type { ProfileVideo } from "../types";

type ProfileVideoGridProps = {
  videos: ProfileVideo[];
};

export default function ProfileVideoGrid({ videos }: ProfileVideoGridProps) {
  if (videos.length === 0) {
    return (
      <p className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-white/50">
        No videos yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
      {videos.map((video) => (
        <li key={video.id}>
          <article className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#080816]/70 transition hover:border-white/20">
            <div
              className={`relative aspect-[3/4] bg-gradient-to-br ${video.gradient}`}
            >
              <div
                className={`absolute inset-x-6 top-8 h-16 rounded-full blur-2xl ${video.accent}`}
              />
              <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                {video.durationLabel}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10">
                <p className="line-clamp-2 text-xs font-bold leading-4 text-white sm:text-sm">
                  {video.title}
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  {video.viewsLabel} views
                </p>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
