"use client";

type CityAiPanelProps = {
  cityName: string;
  onClose: () => void;
};

export default function CityAiPanel({ cityName, onClose }: CityAiPanelProps) {
  return (
    <section
      id="city-ai-panel"
      className="rounded-[28px] border border-purple-300/20 bg-purple-300/10 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-purple-200">
            Ask UMTUBA AI
          </p>
          <h3 className="mt-2 text-xl font-black">Local guide for {cityName}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-purple-50/70">
            Placeholder panel. Future answers about places, creators, and
            journeys will appear here without leaving this city page.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          Close
        </button>
      </div>
    </section>
  );
}
