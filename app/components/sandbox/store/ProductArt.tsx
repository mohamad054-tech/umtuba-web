import type { ProductArt as Art } from "../../../../lib/sandbox/store/art";

function Motif({ motif, accent }: { motif: Art["motif"]; accent: string }) {
  switch (motif) {
    case "orb":
      return <circle cx="80" cy="78" r="34" fill={accent} opacity="0.92" />;
    case "fold":
      return <path d="M48 40h64l-18 88H66z" fill={accent} />;
    case "arch":
      return <path d="M40 118V78a40 40 0 0 1 80 0v40H40z" fill={accent} />;
    case "petal":
      return <ellipse cx="80" cy="80" rx="22" ry="46" fill={accent} transform="rotate(28 80 80)" />;
    case "band":
      return <rect x="36" y="68" width="88" height="22" rx="11" fill={accent} />;
    case "leaf":
      return <path d="M80 36c28 18 36 48 0 88-36-40-28-70 0-88z" fill={accent} />;
    case "loop":
      return <circle cx="80" cy="80" r="30" fill="none" stroke={accent} strokeWidth="14" />;
    case "block":
      return <rect x="50" y="50" width="60" height="60" rx="12" fill={accent} />;
    case "hook":
      return <path d="M52 44h28a28 28 0 0 1 0 56H60V84h20a12 12 0 0 0 0-24H52z" fill={accent} />;
    case "tray":
      return <rect x="38" y="70" width="84" height="28" rx="6" fill={accent} />;
    case "spark":
      return <path d="M80 34l10 34h36l-28 22 10 36-28-22-28 22 10-36-28-22h36z" fill={accent} />;
    default:
      return <rect x="50" y="50" width="60" height="60" rx="16" fill={accent} />;
  }
}

export default function ProductArt({
  art,
  className,
}: {
  art: Art;
  className?: string;
}) {
  return (
    <svg
      className={className ?? "sx-art"}
      viewBox="0 0 160 160"
      role="img"
      aria-label={art.label}
    >
      <rect width="160" height="160" rx="28" fill={art.wash} />
      <Motif motif={art.motif} accent={art.accent} />
      <circle cx="128" cy="36" r="10" fill={art.ink} opacity="0.18" />
    </svg>
  );
}
