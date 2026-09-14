import type { VisualMotif } from "../../../lib/store/visualDemo/data";

export function VisualArt({
  hue,
  motif,
  title,
}: {
  hue: number;
  motif: VisualMotif;
  title: string;
}) {
  const a = `hsl(${hue} 80% 58%)`;
  const b = `hsl(${(hue + 48) % 360} 70% 42%)`;
  const c = `hsl(${(hue + 200) % 360} 55% 18%)`;
  return (
    <div
      className="vd-art"
      aria-hidden
      style={{
        background: `radial-gradient(circle at 30% 20%, ${a}, transparent 42%), linear-gradient(145deg, ${c}, ${b})`,
      }}
    >
      <svg viewBox="0 0 200 140" className="h-full w-full opacity-90">
        {motif === "orb" ? (
          <circle cx="118" cy="62" r="36" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
        ) : null}
        {motif === "grid" ? (
          <g stroke="white" strokeOpacity="0.35">
            <path d="M30 30h140M30 60h140M30 90h140M50 20v100M90 20v100M130 20v100" />
          </g>
        ) : null}
        {motif === "wave" ? (
          <path
            d="M10 90c30-30 50 20 80 0s50-30 90 8"
            fill="none"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="3"
          />
        ) : null}
        {motif === "leaf" ? (
          <path d="M100 20c40 30 40 70 0 100C60 90 60 50 100 20z" fill="white" fillOpacity="0.2" />
        ) : null}
        {motif === "type" ? (
          <text x="28" y="82" fill="white" fillOpacity="0.7" fontSize="42" fontWeight="700">
            Aa
          </text>
        ) : null}
        {motif === "lens" ? (
          <g fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2">
            <rect x="58" y="38" width="84" height="58" rx="10" />
            <circle cx="100" cy="67" r="16" />
          </g>
        ) : null}
        {motif === "thread" ? (
          <path
            d="M20 40c40 0 40 60 80 60s40-60 80-60"
            fill="none"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="3"
          />
        ) : null}
        {motif === "spark" ? (
          <path d="M100 22l8 28h30l-24 18 10 30-24-18-24 18 10-30-24-18h30z" fill="white" fillOpacity="0.28" />
        ) : null}
      </svg>
      <span className="sr-only">{title}</span>
    </div>
  );
}
