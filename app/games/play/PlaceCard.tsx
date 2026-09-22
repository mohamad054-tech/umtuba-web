export function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (code.length !== 2) return "🏳️";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65
  );
}

type Spot = { lat: number; lng: number };

export function PairSketch({ a, b }: { a: Spot; b: Spot }) {
  const minLat = Math.min(a.lat, b.lat);
  const maxLat = Math.max(a.lat, b.lat);
  const minLng = Math.min(a.lng, b.lng);
  const maxLng = Math.max(a.lng, b.lng);
  const latSpan = Math.max(maxLat - minLat, 4);
  const lngSpan = Math.max(maxLng - minLng, 4);
  const project = (spot: Spot) => {
    const x = 16 + ((spot.lng - (minLng + maxLng) / 2) / lngSpan + 0.5) * 88;
    const y = 14 + ((-(spot.lat - (minLat + maxLat) / 2) / latSpan) + 0.5) * 44;
    return { x: Math.min(104, Math.max(16, x)), y: Math.min(58, Math.max(12, y)) };
  };
  const pa = project(a);
  const pb = project(b);
  return (
    <svg className="um-place-sketch" viewBox="0 0 120 72" aria-hidden="true">
      <rect width="120" height="72" rx="8" fill="#0e1a3d" />
      <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#f0a93b" strokeWidth="2" />
      <circle cx={pa.x} cy={pa.y} r="5" fill="#67e8f9" />
      <circle cx={pb.x} cy={pb.y} r="5" fill="#7ed9b8" />
    </svg>
  );
}

export function CityFace({
  flag,
  name,
  country,
}: {
  flag: string;
  name: string;
  country: string;
}) {
  return (
    <span className="um-place-face">
      <span className="um-place-flag" aria-hidden="true">
        {flag}
      </span>
      <span className="um-place-name">{name}</span>
      <span className="um-place-country">{country}</span>
    </span>
  );
}

const COUNTRY_SHAPE: Record<string, string> = {
  sa: "M8 18 H62 L74 34 L58 50 H12 Z",
  eg: "M18 12 H58 L70 28 V52 H16 V28 Z",
  tr: "M8 20 H74 V46 H8 Z",
  fr: "M22 10 H58 L70 28 L54 54 H16 L10 30 Z",
  de: "M24 8 H56 V56 H24 Z",
  jp: "M18 18 h14 v10 H18 Z M40 14 h16 v12 H40 Z M36 34 h18 v12 H36 Z M58 40 h10 v8 H58 Z",
  it: "M34 6 H48 L52 22 L46 40 L54 58 H38 L32 36 L36 20 Z",
  ae: "M16 22 H68 L60 46 H20 Z",
  jo: "M22 16 H58 V48 H22 Z",
  lb: "M34 8 H48 V56 H34 Z",
  ps: "M20 22 H64 V42 H20 Z",
  se: "M30 6 H50 L46 58 H26 Z",
};

export function CountryShape({ id }: { id: string }) {
  const d = COUNTRY_SHAPE[id] ?? "M16 16 H64 V48 H16 Z";
  return (
    <svg className="um-place-shape" viewBox="0 0 80 64" aria-hidden="true">
      <rect width="80" height="64" rx="8" fill="#0e1a3d" />
      <path d={d} fill="#7ed9b8" />
    </svg>
  );
}
