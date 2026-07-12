"use client";

import { journeyCities } from "./journeyData";
import { useJourney } from "./JourneyContext";

const journeyTimes = ["09:41", "10:12", "11:53", "13:27"];

export default function JourneyTimeline() {
  const { currentCityIndex } = useJourney();

  return (
    <div className="absolute right-3 top-3 z-20 w-[220px] rounded-[24px] border border-white/10 bg-black/35 p-4 text-white shadow-2xl backdrop-blur-md md:right-4 md:top-4 md:w-[235px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-cyan-300">
        Journey Timeline
      </p>

      <div className="mt-4 space-y-0.5">
        {journeyCities.map((city, index) => {
          const isCompleted = index < currentCityIndex;
          const isCurrent = index === currentCityIndex;

          return (
            <div key={city.name}>
              <div
                className={[
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-300",
                  isCurrent
                    ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_24px_rgba(103,232,249,0.08)]"
                    : "border-white/[0.06] bg-white/[0.025]",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black",
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
                  <p className="truncate text-sm font-black">{city.name}</p>

                  <p className="truncate text-[10px] text-white/40">
                    {city.country} · {journeyTimes[index]}
                  </p>
                </div>
              </div>

              {index < journeyCities.length - 1 && (
                <div className="ml-[15px] h-3 w-px bg-white/10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}