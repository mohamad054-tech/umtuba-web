const SKY = "#12324a";
const STONE = "#d7d0c2";
const GOLD = "#e2b34a";
const INK = "#1b2438";

function Sky() {
  return <rect width="320" height="180" fill={SKY} />;
}

export default function LandmarkDraw({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={id}>
      <Sky />
      {id === "dome" ? (
        <>
          <ellipse cx="160" cy="150" rx="120" ry="16" fill="#2a4a3e" />
          <path d="M92 132 L108 96 H212 L228 132 Z" fill={STONE} />
          <path d="M118 96 Q160 28 202 96 Z" fill={GOLD} />
          <circle cx="160" cy="46" r="4" fill={INK} />
          <path d="M160 18 q10 10 0 18 q-6 -6 0 -12" fill="none" stroke={GOLD} strokeWidth="3" />
        </>
      ) : null}
      {id === "pyramid" ? (
        <>
          <rect y="128" width="320" height="52" fill="#c4a15a" />
          <path d="M36 140 L118 48 L200 140 Z" fill="#e6d3a1" />
          <path d="M150 140 L214 72 L278 140 Z" fill="#d2b57a" />
          <circle cx="262" cy="40" r="16" fill={GOLD} />
        </>
      ) : null}
      {id === "lattice" ? (
        <>
          <path d="M118 156 L160 28 L202 156" fill="none" stroke={STONE} strokeWidth="8" />
          <path d="M132 156 L160 70 L188 156" fill="none" stroke={STONE} strokeWidth="4" />
          {[70, 96, 122, 146].map((y) => (
            <line key={y} x1={128 + (y - 70) * 0.15} y1={y} x2={192 - (y - 70) * 0.15} y2={y} stroke={STONE} strokeWidth="3" />
          ))}
          <path d="M136 120 L160 78 L184 120 L160 108 Z" fill="none" stroke={GOLD} strokeWidth="2" />
        </>
      ) : null}
      {id === "arena" ? (
        <>
          <ellipse cx="160" cy="108" rx="108" ry="52" fill="#c8b49a" />
          <ellipse cx="160" cy="108" rx="72" ry="32" fill="#6d5340" />
          {[78, 112, 146, 180, 214].map((x) => (
            <path key={x} d={`M${x} 118 v22 a12 12 0 0 0 24 0 v-22`} fill="none" stroke={INK} strokeWidth="3" />
          ))}
          <rect x="52" y="96" width="216" height="8" fill="#a89078" />
        </>
      ) : null}
      {id === "tower" ? (
        <>
          <path d="M148 164 L154 70 L160 18 L166 70 L172 164 Z" fill="#d5deea" />
          <path d="M136 110 H184 L176 128 H144 Z" fill="#b7c4d6" />
          <path d="M128 140 H192 L182 158 H138 Z" fill="#9aabbf" />
          <circle cx="160" cy="16" r="3" fill={GOLD} />
        </>
      ) : null}
      {id === "neon" ? (
        <>
          <rect x="24" y="36" width="28" height="70" fill="#e25b7a" />
          <rect x="58" y="22" width="22" height="84" fill="#49d0c2" />
          <rect x="230" y="30" width="30" height="76" fill="#f0a93b" />
          <rect x="266" y="48" width="24" height="58" fill="#7aa2ff" />
          <rect y="128" width="320" height="52" fill="#1a2030" />
          {[40, 78, 116, 154, 192, 230].map((x) => (
            <rect key={x} x={x} y="146" width="22" height="8" fill="#f4f1ea" transform="rotate(-18 160 150)" />
          ))}
        </>
      ) : null}
    </svg>
  );
}
