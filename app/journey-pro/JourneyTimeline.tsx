"use client";

import { journeyCities } from "../components/journey-pro/journeyData";
import { useJourney } from "../components/journey-pro/JourneyContext";

const journeyTimes = ["09:41", "10:12", "11:53", "13:27"];

export default function JourneyTimeline() {
  const { currentCityIndex } = useJourney();

  return (
    <div className="absolute right-6 top-6 w-72 rounded-3xl border border-white/10 bg-black/60 p-5 text-white backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
        Journey Timeline
      </p>

      <div className="mt-5 space-y-1">
        {journeyCities.map((city, index) => {
          const isCompleted = index < currentCityIndex;
          const isCurrent = index === currentCityIndex;

          return (
            <div key={city.name}>
              <div
                className={[
                  "flex items-center gap-3 rounded-2xl border p-3 transition",
                  isCurrent
                    ? "border-cyan-300/30 bg-cyan-300/10"
                    : "border-white/5 bg-white/[0.03]",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black",
                    isCompleted
                      ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-300"
                      : isCurrent
                        ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200"
                        : "border-white/10 bg-white/5 text-white/35",
                  ].join(" ")}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "truncate font-black",
                      isCurrent
                        ? "text-white"
                        : isCompleted
                          ? "text-emerald-200"
                          : "text-white/45",
                    ].join(" ")}
                  >
                    {city.name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {city.country} · {journeyTimes[index]}
                  </p>
                </div>

                {isCurrent ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_#67e8f9]" />
                ) : null}
              </div>

              {index < journeyCities.length - 1 ? (
                <div className="ml-[17px] h-5 w-px bg-white/10" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}