import VideoCard from "../components/VideoCard";

export default function FeedPage() {
  const videos = [
    { id: 1, user: "Ahmed", title: "Amazing Sunset", views: "24K" },
    { id: 2, user: "Sarah", title: "Street Food", views: "82K" },
    { id: 3, user: "John", title: "AI Challenge", views: "120K" },
    { id: 4, user: "Lina", title: "New Talent", views: "51K" },
    { id: 5, user: "Omar", title: "Live Moment", views: "98K" },
    { id: 6, user: "Maya", title: "Idea Spark", views: "33K" },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-3xl font-black">UMTUBA</h1>

          <input
            placeholder="Search UMTUBA..."
            className="hidden w-96 rounded-full border border-white/10 bg-white/5 px-5 py-3 outline-none md:block"
          />

          <div className="flex items-center gap-3">
            <button className="rounded-full bg-white px-5 py-2 font-bold text-black">
              Upload
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black font-black">
              M
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-28 space-y-3">
            {["For You", "Following", "Live", "AI", "Ideas", "Trending"].map(
              (item) => (
                <button
                  key={item}
                  className="w-full rounded-2xl bg-white/5 px-5 py-4 text-left font-bold hover:bg-white/10"
                >
                  {item}
                </button>
              )
            )}
          </div>
        </aside>

        <section>
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
              Feed
            </p>
            <h2 className="mt-3 text-5xl font-black">Discover</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                title={video.title}
                creator={video.user}
                views={video.views}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}