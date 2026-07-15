import { notFound } from "next/navigation";
import JourneyGlobePro from "../components/JourneyGlobePro";
import { isExperimentalRouteAvailable } from "../lib/product/surfaceGates";

/**
 * Experimental globe lab — development only.
 * Production users: notFound(). Product journey UI is /post-journey.
 */
export default function JourneyProPage() {
  if (!isExperimentalRouteAvailable()) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#03030b] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
            UMTUBA Experimental Lab · development only
          </p>

          <h1 className="mt-2 text-4xl font-black">Journey Globe Pro</h1>
        </div>

        <JourneyGlobePro />
      </div>
    </main>
  );
}
