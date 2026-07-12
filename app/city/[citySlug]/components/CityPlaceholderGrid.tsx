type CityPlaceholderGridProps = {
  section: string;
  cityName: string;
};

export default function CityPlaceholderGrid({
  section,
  cityName,
}: CityPlaceholderGridProps) {
  const cards = [
    `${section} spotlight in ${cityName}`,
    `Emerging ${section.toLowerCase()} near you`,
    `Local ${section.toLowerCase()} to watch next`,
  ];

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((label) => (
        <article
          key={label}
          className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
            Placeholder
          </p>
          <h3 className="mt-3 text-base font-black text-white/85">{label}</h3>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Prototype card — not live data. Backend connections come later.
          </p>
        </article>
      ))}
    </div>
  );
}
