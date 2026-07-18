import PlaceholderPanel from "./PlaceholderPanel";

/** Brands table has no public seed yet — premium placeholder rail. */
export default function BrandRail() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {["Aura", "Nova", "Pulse", "Vertex"].map((name) => (
        <div
          key={name}
          className="rounded-[24px] border border-white/10 bg-[#080816]/80 px-4 py-6 text-center opacity-70"
          aria-hidden
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/15 text-sm font-black">
            {name[0]}
          </div>
          <p className="mt-3 text-sm font-bold text-white/70">{name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
            Coming soon
          </p>
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-4">
        <PlaceholderPanel
          title="Popular brands"
          description="Verified brand discovery ships with the brand registry experience. Placeholders only — no demo catalog records."
          tone="indigo"
        />
      </div>
    </div>
  );
}
