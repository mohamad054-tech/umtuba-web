import ActionBar from "./ActionBar";

type VideoCardProps = {
  title: string;
  creator: string;
  views: string;
};

export default function VideoCard({ title, creator, views }: VideoCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827] transition hover:scale-[1.02]">
      <div className="h-64 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />

      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black font-black">
            {creator[0]}
          </div>

          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-white/60">@{creator} ✔</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/40">{views} views</p>

        <ActionBar />

        <button className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-black">
          Watch
        </button>
      </div>
    </div>
  );
}