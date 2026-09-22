/**
 * Shared look taken from the catalogue tiles:
 * night sky, deep blue and purple, gold edges, mint glow, soft light.
 * Games should read these values instead of inventing flat colours.
 */

export const GAME_THEME = {
  night: "#060512",
  navy: "#0B1230",
  blue: "#2A45B8",
  purple: "#5A2494",
  field: "#10183A",
  gold: "#F0A93B",
  goldHot: "#FFE7A3",
  goldDeep: "#C8871A",
  mint: "#7ED9B8",
  mintGlow: "#3DFFC8",
  cream: "#F7F4EA",
  ink: "#14261C",
  radius: 18,
  font: "ui-sans-serif, system-ui, sans-serif",
  titlePx: 28,
  bodyPx: 15,
  particleCap: 16,
} as const;

export const GAME_MUTE_KEY = "umtuba.games.mute.v1";

let mutedCache: boolean | null = null;

export function parseMuted(raw: string | null | undefined): boolean {
  return raw === "1";
}

export function readGameMuted(): boolean {
  if (mutedCache != null) return mutedCache;
  if (typeof window === "undefined") return false;
  try {
    mutedCache = parseMuted(window.localStorage.getItem(GAME_MUTE_KEY));
  } catch {
    mutedCache = false;
  }
  return mutedCache;
}

export function writeGameMuted(muted: boolean): void {
  mutedCache = muted;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAME_MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event("umtuba-games-mute"));
}

export function easeOutCubic(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 3;
}

/** Shortest-path blend so a turn does not spin the long way around. */
export function lerpAngle(current: number, target: number, amount: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const step = Math.min(1, Math.max(0, amount));
  return current + delta * step;
}
