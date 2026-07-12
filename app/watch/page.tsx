import { Suspense } from "react";
import WatchExperience from "./WatchExperience";

function WatchFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      </div>
      <p className="relative rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur">
        Opening UMTUBA Watch...
      </p>
    </main>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<WatchFallback />}>
      <WatchExperience />
    </Suspense>
  );
}
