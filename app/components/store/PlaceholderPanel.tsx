type PlaceholderPanelProps = {
  title: string;
  description: string;
  tone?: "violet" | "indigo" | "fuchsia";
};

const TONE: Record<NonNullable<PlaceholderPanelProps["tone"]>, string> = {
  violet: "border-violet-400/25 bg-violet-500/10",
  indigo: "border-indigo-400/25 bg-indigo-500/10",
  fuchsia: "border-fuchsia-400/25 bg-fuchsia-500/10",
};

export default function PlaceholderPanel({
  title,
  description,
  tone = "violet",
}: PlaceholderPanelProps) {
  return (
    <div
      className={`rounded-[24px] border px-5 py-8 text-center ${TONE[tone]}`}
      aria-label={`${title} — coming soon`}
    >
      <p className="text-sm font-black tracking-tight text-white/85">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/45">
        {description}
      </p>
    </div>
  );
}
