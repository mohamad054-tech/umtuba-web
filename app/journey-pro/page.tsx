import JourneyGlobePro from "../components/JourneyGlobePro";

export default function JourneyProPage() {
  return (
    <main className="min-h-screen bg-[#03030b] p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
            UMTUBA Experimental Lab
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Journey Globe Pro
          </h1>
        </div>

        <JourneyGlobePro />
      </div>
    </main>
  );
}