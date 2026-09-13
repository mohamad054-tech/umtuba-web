let seq = 0;

export function resetLabIds(): void {
  seq = 0;
}

export function newLabId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString().padStart(6, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toAddress(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `0x${hash.toString(16).padStart(8, "0")}${seed
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32)
    .padEnd(32, "0")
    .slice(0, 32)}`;
}

export function displayToken(amount: bigint, decimals: number): string {
  if (amount === BigInt(0)) return "0";
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function pointsToTokenUnits(
  points: number,
  decimals: number,
  mapping: number
): bigint {
  if (!Number.isInteger(points) || points <= 0) return BigInt(0);
  if (!Number.isInteger(mapping) || mapping <= 0) return BigInt(0);
  return BigInt(points) * BigInt(mapping) * BigInt(10) ** BigInt(decimals);
}
