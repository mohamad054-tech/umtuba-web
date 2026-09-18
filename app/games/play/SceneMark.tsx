const G = "#F0A93B";
const S = "#2C6257";
const L = "#1E4A42";

export default function SceneMark({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={kind}>
      <rect width="320" height="160" fill="#123B48" />
      {kind === "pyramid" ? (
        <>
          <path d="M40 150 L100 62 L160 150Z" fill={S} />
          <path d="M150 150 L195 88 L240 150Z" fill="#23524A" />
          <circle cx="262" cy="42" r="14" fill={G} />
        </>
      ) : kind === "tower" ? (
        <path d="M148 156 L155 36 L160 18 L165 36 L172 156Z" fill={S} />
      ) : kind === "lattice" ? (
        <path d="M120 156 L150 58 L160 40 L170 58 L200 156 L182 156 L160 74 L138 156Z" fill={S} />
      ) : kind === "neon" ? (
        <>
          {[24, 66, 112, 168, 214, 260].map((x, i) => (
            <rect key={x} x={x} y={50 + (i % 3) * 16} width="34" height={100 - (i % 3) * 16} fill="#23524A" />
          ))}
        </>
      ) : kind === "arena" ? (
        <>
          <ellipse cx="160" cy="96" rx="88" ry="46" fill={S} />
          <ellipse cx="160" cy="96" rx="58" ry="28" fill="#1A4038" />
        </>
      ) : kind === "souq" ? (
        <rect x="46" y="86" width="228" height="50" fill={S} />
      ) : kind === "skyline" ? (
        [18, 48, 80, 116, 150, 192, 228, 266].map((x, i) => (
          <rect key={x} x={x} y={40 + ((i * 37) % 50)} width="26" height={110 - ((i * 37) % 50)} fill={S} />
        ))
      ) : kind === "savanna" ? (
        <>
          <circle cx="258" cy="40" r="16" fill={G} />
          <rect y="120" width="320" height="40" fill="#3E6B52" />
        </>
      ) : (
        <>
          <rect y="118" width="320" height="42" fill={L} />
          <path d="M130 112 Q160 62 190 112Z" fill={G} />
        </>
      )}
    </svg>
  );
}
