export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full border border-white/20 px-4 py-2 text-sm text-white/70">
          UMTUBA Alpha 0.1
        </div>

        <h1 className="text-6xl md:text-8xl font-black">
          UMTUBA
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-white/70">
          Ideas Without Borders — a new world for videos, AI companions,
          and live discovery.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <button className="rounded-full bg-white px-8 py-4 font-bold text-black">
            Start Exploring
          </button>

          <button className="rounded-full border border-white/30 px-8 py-4 font-bold">
            Join Beta
          </button>
        </div>
      </section>
    </main>
  );
}