import { notFound } from "next/navigation";
import Link from "next/link";
import AuthStatus from "../components/AuthStatus";
import CreatePostButton from "../components/CreatePostButton";
import FeedContent from "../components/FeedContent";
import { isExperimentalRouteAvailable } from "../lib/product/surfaceGates";

/**
 * Legacy social feed — real posts still load in development.
 * Production: unavailable (use /discover). Kept for local comparison only.
 */
export default function FeedPage() {
  if (!isExperimentalRouteAvailable()) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050510]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-3xl font-black">
            UMTUBA
          </Link>

          <p className="hidden text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80 md:block">
            Legacy feed · development only
          </p>

          <div className="flex items-center gap-3">
            <CreatePostButton />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:grid-cols-[230px_1fr_300px]">
        <aside className="hidden md:block">
          <div className="sticky top-28 space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-50/90">
            <p className="font-bold">Legacy surface</p>
            <p className="text-amber-50/70">
              Prefer Discover for the production vertical feed. Sidebar actions
              here are not product navigation.
            </p>
            <Link
              href="/discover"
              className="mt-2 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-black"
            >
              Open Discover
            </Link>
          </div>
        </aside>

        <section>
          <FeedContent />
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4 text-sm text-white/50">
            <p>
              This layout is a development reference. Dead “AI / Ideas /
              UConnect” chrome has been removed from production navigation.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
