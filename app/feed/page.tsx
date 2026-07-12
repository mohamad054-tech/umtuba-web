import Link from "next/link";
import AuthStatus from "../components/AuthStatus";
import CreatePostButton from "../components/CreatePostButton";
import FeedContent from "../components/FeedContent";

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050510]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-black">
            UMTUBA
          </Link>

          <input
            placeholder="Search videos, people, ideas, opportunities..."
            className="hidden w-96 rounded-full border border-white/10 bg-white/5 px-5 py-3 outline-none md:block"
          />

          <div className="flex items-center gap-3">
            <CreatePostButton />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-[230px_1fr_300px]">
        <aside className="hidden md:block">
          <div className="sticky top-28 space-y-3">
            {[
              "🔥 For You",
              "👥 Following",
              "🔴 Live",
              "🤖 AI",
              "💡 Ideas",
              "🚀 Opportunities",
              "🌍 Post Journey",
              "🤝 UConnect",
            ].map((item) => (
              <button
                key={item}
                type="button"
                className="w-full rounded-2xl bg-white/5 px-5 py-4 text-left font-bold hover:bg-white/10"
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section>
          <div className="mb-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-emerald-900/20 p-8">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
              Discovery Engine
            </p>

            <h1 className="mt-3 text-5xl font-black">
              Discover, connect, and grow globally
            </h1>

            <p className="mt-4 max-w-2xl text-white/60">
              UMTUBA is where posts travel, languages disappear, and creators
              connect directly with people around the world.
            </p>
          </div>

          <FeedContent />
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-28 space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black">🌍 Global Reach</h3>
              <p className="mt-3 text-white/60">
                Posts can travel across countries, cities, languages, and
                communities.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black">🤝 UConnect</h3>
              <p className="mt-3 text-white/60">
                Viewers can request video greetings, share ideas, collaborate,
                or connect when creators allow it.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black">🌐 AI Translation</h3>
              <p className="mt-3 text-white/60">
                Posts, voice, comments, and future live streams adapt to the
                viewer’s language.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}