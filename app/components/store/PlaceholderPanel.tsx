type PlaceholderPanelProps = {
  title: string;
  description: string;
  tone?: "violet" | "indigo" | "fuchsia";
};

export default function PlaceholderPanel({
  title,
  description,
}: PlaceholderPanelProps) {
  return (
    <div
      className="rounded-[var(--sf-radius)] border border-dashed border-[var(--sf-line)] bg-[rgba(106,76,255),0.04)] px-5 py-8 text-center"
      aria-label={`${title} — coming soon`}
    >
      <p className="sf-display text-sm font-semibold tracking-tight text-[var(--sf-ink)]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--sf-muted)]">
        {description}
      </p>
    </div>
  );
}
