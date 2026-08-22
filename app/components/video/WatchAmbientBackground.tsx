"use client";

/**
 * Decorative Watch backdrop only. Must never attach a second media
 * element (that duplicated the active clip's signed object).
 */
export default function WatchAmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#050510]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#050510]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510]/55 via-[#050510]/75 to-[#050510]" />
      <div className="absolute left-[-12%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
      <div className="absolute right-[-10%] top-[18%] h-[26rem] w-[26rem] rounded-full bg-purple-600/22 blur-3xl" />
      <div className="absolute bottom-[-14%] left-[28%] h-[24rem] w-[24rem] rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  );
}
