import { Suspense } from "react";
import LeftSidebar from "../components/LeftSidebar";
import TopNavbar from "../components/TopNavbar";
import PostJourneyGlobeSection from "./PostJourneyGlobeSection";

function PostJourneyGlobeFallback() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b18]">
      <div className="flex h-[620px] items-center justify-center text-sm text-white/50">
        Loading globe...
      </div>
    </div>
  );
}

const journeyStats = [
  {
    label: "Countries reached",
    value: "18",
    icon: "🌍",
  },
  {
    label: "Cities reached",
    value: "47",
    icon: "🏙️",
  },
  {
    label: "Translations",
    value: "9",
    icon: "🌐",
  },
  {
    label: "Total interactions",
    value: "12.8K",
    icon: "✨",
  },
];

const journeyStops = [
  {
    city: "Jerusalem",
    country: "Palestine",
    time: "Journey started",
    views: "1.2K",
  },
  {
    city: "Amman",
    country: "Jordan",
    time: "12 minutes later",
    views: "2.6K",
  },
  {
    city: "Istanbul",
    country: "Türkiye",
    time: "31 minutes later",
    views: "4.1K",
  },
  {
    city: "Berlin",
    country: "Germany",
    time: "1 hour later",
    views: "3.7K",
  },
];

export default function PostJourneyPage() {
  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <TopNavbar />

      <div className="mx-auto grid max-w-[1420px] grid-cols-1 gap-7 px-5 py-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <LeftSidebar />

        <section className="min-w-0">
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#17112f] via-[#0e1024] to-[#071d20] p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                  UMTUBA Global Discovery
                </p>

                <h1 className="mt-3 text-4xl font-black sm:text-5xl">
                  Post Journey
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                  Follow how a post travels between countries, cities,
                  languages, and communities around the world.
                </p>
              </div>

              <button
                type="button"
                className="rounded-2xl bg-white px-5 py-3 font-black text-black transition hover:bg-white/90"
              >
                Select a post
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {journeyStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-3xl font-black">{stat.value}</span>
                </div>

                <p className="mt-4 text-sm font-bold text-white/50">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Suspense fallback={<PostJourneyGlobeFallback />}>
              <PostJourneyGlobeSection />
            </Suspense>
          </div>

          <div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black">Journey timeline</h2>

            <p className="mt-2 text-white/50">
              See where the post reached and how engagement grew.
            </p>

            <div className="mt-6 space-y-4">
              {journeyStops.map((stop, index) => (
                <div
                  key={`${stop.city}-${stop.country}`}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-[#0d0d1c] p-5"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-black text-black">
                      {index + 1}
                    </div>

                    {index < journeyStops.length - 1 ? (
                      <div className="mt-2 h-full min-h-10 w-px bg-white/10" />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black">
                        {stop.city}, {stop.country}
                      </h3>

                      <p className="mt-1 text-sm text-white/45">
                        {stop.time}
                      </p>
                    </div>

                    <div className="rounded-full bg-white/5 px-4 py-2 text-sm font-bold">
                      {stop.views} views
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black">🌐 Languages</h3>

              <div className="mt-5 space-y-4">
                <LanguageRow language="Arabic" percentage="46%" />
                <LanguageRow language="English" percentage="31%" />
                <LanguageRow language="Turkish" percentage="14%" />
                <LanguageRow language="German" percentage="9%" />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-xl font-black">✨ Journey insight</h3>

              <p className="mt-4 leading-7 text-white/55">
                The post gained its fastest growth after being translated
                into Turkish and shared by users in Istanbul.
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <h3 className="text-xl font-black text-cyan-100">
                AI recommendation
              </h3>

              <p className="mt-4 leading-7 text-cyan-50/65">
                Add an English summary to help this post reach more
                communities in Europe.
              </p>

              <button
                type="button"
                className="mt-5 w-full rounded-2xl bg-cyan-100 px-4 py-3 font-black text-black"
              >
                Improve post
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

type LanguageRowProps = {
  language: string;
  percentage: string;
};

function LanguageRow({
  language,
  percentage,
}: LanguageRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-bold text-white/65">{language}</span>
      <span className="font-black">{percentage}</span>
    </div>
  );
}