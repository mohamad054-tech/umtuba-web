"use client";

import { useMemo } from "react";
import type { WorldCity } from "../../../lib/games/play/banks";

type Pin = WorldCity & { x: number; y: number };

function spread(cities: readonly WorldCity[]): Pin[] {
  const pins: Pin[] = cities.map((city) => ({
    ...city,
    x: ((city.lng + 180) / 360) * 100,
    y: ((90 - city.lat) / 180) * 100,
  }));
  for (let pass = 0; pass < 12; pass += 1) {
    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const a = pins[i]!;
        const b = pins[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        if (dist >= 5) continue;
        const push = (5 - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
      }
    }
  }
  return pins.map((pin) => ({
    ...pin,
    x: Math.min(94, Math.max(6, pin.x)),
    y: Math.min(88, Math.max(12, pin.y)),
  }));
}

export default function LightWorldMap({
  cities,
  got,
  onPick,
}: {
  cities: readonly WorldCity[];
  got: readonly string[];
  onPick: (id: string) => void;
}) {
  const pins = useMemo(() => spread(cities), [cities]);
  return (
    <div className="um-light-map um-play-board um-lit-board" dir="ltr">
      <svg className="um-light-map-land" viewBox="0 0 360 180" aria-hidden="true">
        <rect width="360" height="180" fill="#0c1842" />
        <g fill="#1d6b56" stroke="#7ed9b8" strokeWidth="0.7" strokeLinejoin="round">
          <path d="M22 42c8-16 28-22 48-18 14 2 22 8 28 4 8-8 22-6 30 2 6 8 4 16-2 22 8 4 14 14 8 24-8 8-4 16 2 24-10 6-22 4-30-2-8 10-22 8-32 2-12-2-18-12-16-22-10-2-20-10-22-20-6-8-10-14-14-16z" />
          <path d="M88 86c8-2 16 4 18 12 6 10 14 14 12 26-2 14-8 24-6 34 2 8-6 14-14 12-10-4-12-16-8-26-6-8-14-8-16-18 0-12 4-28 14-40z" />
          <path d="M158 28c8-8 22-12 34-8 8 2 12 8 10 14-6 2-4 8 2 12 8 2 10 10 4 16-8 4-16 2-22-2-6 4-14 2-18-4-6-4-12-10-10-28z" />
          <path d="M156 62c12-8 28-8 36 2 6 8 14 10 16 20 4 12-2 22 2 32 4 12-2 22-12 28-12 4-20-2-24-12-6-8-14-8-20-2-8-10-12-24-8-36 2-12 2-24 10-32z" />
          <path d="M196 36c18-14 48-16 78-6 20 6 36 4 52 14 8 8 6 16-2 20-10 2-8 12 2 18 8 8 4 16-4 22-16 4-12 14-2 22-18 4-36 0-48-8-10-2-22 4-32-2-12-8-22-6-28-18-8-10-16-28-16-62z" />
          <path d="M300 118c14-8 32-6 38 4 4 8 0 16-10 20-12 4-24 0-30-8-4-6-4-12 2-16z" />
        </g>
      </svg>
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          className={`um-light-pin${got.includes(pin.id) ? " got" : ""}`}
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          data-play-item="true"
          onClick={() => onPick(pin.id)}
          aria-label={pin.city}
        />
      ))}
    </div>
  );
}
