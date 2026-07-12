"use client";

type DestinationArrivalCardProps = {
  city: string;
  country: string;
  videoTitle: string;
  creator: string;
  usedFallback?: boolean;
  onExplore: () => void;
};

export default function DestinationArrivalCard({
  city,
  country,
  videoTitle,
  creator,
  usedFallback = false,
  onExplore,
}: DestinationArrivalCardProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 right-5 z-20 md:left-auto md:right-6 md:w-[320px]">
      <div className="rounded-[28px] border border-white/10 bg-[#0b0b18]/92 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
          Destination
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">
          {city}
          <span className="text-white/50">, {country}</span>
        </h3>
        <p className="mt-3 text-sm font-bold text-white/90">{videoTitle}</p>
        <p className="mt-1 text-sm text-white/55">{creator}</p>
        {usedFallback ? (
          <p className="mt-2 text-xs text-white/40">
            Mapped to the nearest journey city for a safe landing.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onExplore}
          className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-white/90"
        >
          Explore
        </button>
      </div>
    </div>
  );
}
