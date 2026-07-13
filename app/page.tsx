import { Suspense } from "react";
import LandingHero from "./components/landing/LandingHero";

function LandingHeroFallback() {
  return (
    <header className="landing-hero relative isolate min-h-[100svh] overflow-hidden bg-[#050510]" />
  );
}

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
    <main className="min-h-screen overflow-hidden bg-[#050510] font-sans text-white">
      <Suspense fallback={<LandingHeroFallback />}>
        <LandingHero />
      </Suspense>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-6 md:px-12">
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
          <button className="mt-10 rounded-full bg-white px-10 py-4 font-black text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(59,130,246,0.28)] active:scale-[0.98]">
            Join the Beta
          </button>
        </div>
      </section>
    </main>
  );
}
