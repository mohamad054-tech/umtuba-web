type Spot = { lat: number; lng: number };

export function CountryFlag({ id, large = false }: { id: string; large?: boolean }) {
  return (
    <img
      className={large ? "um-country-flag large" : "um-country-flag"}
      src={`/games/flags/${id}.svg`}
      alt=""
      draggable={false}
    />
  );
}

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
  iso,
  name,
  country,
}: {
  iso: string;
  name: string;
  country: string;
}) {
  return (
    <span className="um-place-face">
      <CountryFlag id={iso} />
      <span className="um-place-name">{name}</span>
      {country ? <span className="um-place-country">{country}</span> : null}
    </span>
  );
}
