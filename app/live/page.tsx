import { Suspense } from "react";
import { liveMetadata } from "../../lib/site/routeMetadata";
import LiveExperience from "./LiveExperience";

export const metadata = liveMetadata;

function LiveFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-red-500/15 blur-3xl" />
      </div>
      <p className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        Opening UMTUBA Live...
      </p>
    </main>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<LiveFallback />}>
      <LiveExperience />
    </Suspense>
  );
}
