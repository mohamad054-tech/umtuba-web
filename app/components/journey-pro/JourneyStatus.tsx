"use client";

import { journeyCities } from "./journeyData";
import { useJourney } from "./JourneyContext";

const aiInsights = [
  "The journey has started in Palestine. Early engagement is building.",
  "The post is gaining traction in Jordan. Arabic engagement remains strong.",
  "The post is spreading quickly in Türkiye. A Turkish translation may increase reach.",
  "The post has reached Germany. Consider adding a German summary for stronger growth.",
];

export default function JourneyStatus() {
  const { currentCityIndex } = useJourney();

  const city = journeyCities[currentCityIndex] ?? journeyCities[0];
  const insight = aiInsights[currentCityIndex] ?? aiInsights[0];

  return (
    <div className="absolute left-3 top-3 z-20 w-[250px] rounded-[24px] border border-white/10 bg-black/35 p-4 text-white shadow-2xl backdrop-blur-md md:left-4 md:top-4 md:w-[265px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
        Live Journey
      </p>

      <h2 className="mt-2 text-2xl font-black leading-none">{city.name}</h2>

      <p className="mt-1 text-sm text-white/55">{city.country}</p>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
        Active location
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/[0.06] p-2.5">
          <p className="text-[10px] text-white/45">Views</p>
          <p className="mt-1 text-base font-black">
            {city.views.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.06] p-2.5">
          <p className="text-[10px] text-white/45">Likes</p>
          <p className="mt-1 text-base font-black">
            {city.likes.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.06] p-2.5">
          <p className="text-[10px] text-white/45">Comments</p>
          <p className="mt-1 text-base font-black">
            {city.comments.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          AI Insight
        </p>

        <p className="mt-2 text-xs leading-5 text-white/70">{insight}</p>
      </div>
    </div>
  );
}