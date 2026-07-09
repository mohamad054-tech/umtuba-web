export default function Home() {
  const worlds = [
    { icon: "🎬", title: "Videos", text: "Fast, creative moments built for discovery." },
    { icon: "🔥", title: "Challenges", text: "Daily missions that make users come back." },
    { icon: "🤖", title: "AI Companion", text: "A trusted guide that helps every talent grow." },
    { icon: "💡", title: "Ideas", text: "Turn thoughts into projects, teams, and opportunities." },
    { icon: "🌍", title: "Global", text: "A platform for creators without borders." },
    { icon: "🚀", title: "Opportunities", text: "Connect talent with real chances to move forward." },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050510] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[35%] h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="text-2xl font-black tracking-tight">UMTUBA</div>

        <div className="hidden items-center gap-8 text-sm text-white/65 md:flex">
          <span>Explore</span>
          <span>Live</span>
          <span>AI</span>
          <span>Ideas</span>
        </div>

        <button className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold backdrop-blur">
          Join Beta
        </button>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[82vh] max-w-7xl items-center gap-12 px-6 py-10 md:grid-cols-2 md:px-12">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/70">
            UMTUBA Alpha 0.2 · Built for a new generation
          </div>

          <h1 className="max-w-4xl text-6xl font-black leading-[0.95] tracking-tight md:text-8xl">
            Ideas
            <span className="block bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
              Without
            </span>
            Borders
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
            A social world for videos, challenges, live discovery, AI companions,
            and turning talent into real opportunities.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button className="rounded-full bg-white px-8 py-4 font-black text-black">
              Start Exploring
            </button>
            <button className="rounded-full border border-white/15 bg-white/5 px-8 py-4 font-black">
              Watch Demo
            </button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-blue-500/40 via-purple-500/30 to-emerald-400/30 blur-2xl" />

          <div className="relative rounded-[3rem] border border-white/15 bg-black/70 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[2.4rem] border border-white/10 bg-[#0b0b18] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold">For You</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Live</span>
              </div>

              <div className="space-y-4">
                {["AI Challenge", "Street Talent", "Idea Spark"].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="mb-4 h-36 rounded-2xl bg-gradient-to-br from-blue-500/30 via-purple-500/25 to-emerald-400/20" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold">{item}</h3>
                        <p className="text-xs text-white/50">
                          {index + 12}K people watching
                        </p>
                      </div>
                      <button className="rounded-full bg-white px-4 py-2 text-xs font-black text-black">
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 md:px-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
            The UMTUBA World
          </p>
          <h2 className="mt-4 text-4xl font-black md:text-6xl">
            More than watching.
            <br />
            A place to grow.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {worlds.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.07]"
            >
              <div className="text-4xl">{item.icon}</div>
              <h3 className="mt-6 text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-white/60">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur md:p-14">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
            Beta Mission
          </p>
          <h2 className="mt-5 text-4xl font-black md:text-6xl">
            Build the first social platform where every talent gets a chance.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/60">
            UMTUBA starts with fun, discovery, and social energy — then gradually
            helps users discover ideas, collaborators, learning paths, and real opportunities.
          </p>
          <button className="mt-10 rounded-full bg-white px-10 py-4 font-black text-black">
            Join the Beta
          </button>
        </div>
      </section>
    </main>
  );
}