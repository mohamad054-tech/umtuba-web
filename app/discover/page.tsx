import { Suspense } from "react";
import { getDiscoverVideosServer } from "../../lib/supabase/videoPostsServer";
import DiscoverExperience from "./DiscoverExperience";

export const dynamic = "force-dynamic";

function DiscoverFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
      </div>
      <p
        className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur"
        role="status"
      >
        Opening UMTUBA Discover...
      </p>
    </main>
  );
}

async function DiscoverLoader() {
  const result = await getDiscoverVideosServer();

  if (!result.ok) {
    return <DiscoverExperience videos={[]} loadError={result.message} />;
  }

  return <DiscoverExperience videos={result.videos} />;
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverLoader />
    </Suspense>
  );
}
