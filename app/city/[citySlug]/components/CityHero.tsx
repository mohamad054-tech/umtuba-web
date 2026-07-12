type CityHeroProps = {
  city: string;
  country: string;
  known: boolean;
  sourceTitle: string | null;
};

export default function CityHero({
  city,
  country,
  known,
  sourceTitle,
}: CityHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(103,232,249,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(167,139,250,0.16),_transparent_50%),linear-gradient(180deg,#0b1024_0%,#050510_70%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-300">
          UMTUBA City
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
          {city}
        </h1>
        <p className="mt-3 text-base text-white/60 sm:text-lg">{country}</p>
        {!known ? (
          <p className="mt-4 max-w-xl text-sm text-white/45">
            This city is not in the journey map yet. Showing a safe discovery
            shell so you can still explore the prototype.
          </p>
        ) : null}
        {sourceTitle ? (
          <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            Arrived from · {sourceTitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
