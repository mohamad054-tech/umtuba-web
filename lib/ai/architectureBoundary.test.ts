import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const AI_ROOT = join(process.cwd(), "lib/ai");

const DOMAIN_DIRS = [
  "capabilities/commerce",
  "capabilities/learning",
  "capabilities/ads",
  "capabilities/creator",
  "capabilities/games",
  "capabilities/admin",
] as const;

function walkTsFiles(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTsFiles(full));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function importLines(src: string): string[] {
  return src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.startsWith("import ") ||
        l.startsWith("export ") && l.includes(" from ")
    );
}

describe("AI architecture boundary", () => {
  it("Domain AI modules do not import React or UI layers", () => {
    const offenders: string[] = [];
    for (const domain of DOMAIN_DIRS) {
      const dir = join(AI_ROOT, domain);
      for (const file of walkTsFiles(dir)) {
        const src = readFileSync(file, "utf8");
        const rel = relative(process.cwd(), file).replace(/\\/g, "/");
        if (/\bfrom\s+["']react["']/.test(src)) offenders.push(`${rel}: react`);
        if (/\bfrom\s+["']react\//.test(src)) offenders.push(`${rel}: react/*`);
        if (/\bfrom\s+["'][^"']*\/app\//.test(src))
          offenders.push(`${rel}: app import`);
        if (/\bfrom\s+["'][^"']*components\//.test(src))
          offenders.push(`${rel}: components import`);
        if (/\bfrom\s+["']next\/(link|navigation|headers|image)["']/.test(src))
          offenders.push(`${rel}: next UI import`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Domain AI modules do not import other Domain AI trees", () => {
    const offenders: string[] = [];
    const domainNames = DOMAIN_DIRS.map((d) => d.split("/")[1]!);
    for (const domain of DOMAIN_DIRS) {
      const self = domain.split("/")[1]!;
      const dir = join(AI_ROOT, domain);
      for (const file of walkTsFiles(dir)) {
        const src = readFileSync(file, "utf8");
        const rel = relative(process.cwd(), file).replace(/\\/g, "/");
        for (const other of domainNames) {
          if (other === self) continue;
          if (
            src.includes(`capabilities/${other}/`) ||
            src.includes(`../${other}/`) ||
            src.includes(`../../capabilities/${other}/`)
          ) {
            offenders.push(`${rel} → ${other}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("UI-facing contracts do not re-export provider secrets or raw prompts", () => {
    const pub = readFileSync(join(AI_ROOT, "contracts/public.ts"), "utf8");
    expect(pub).not.toMatch(/OPENAI_API_KEY|systemInstructions|apiKey/i);
    const service = readFileSync(join(AI_ROOT, "services/aiService.ts"), "utf8");
    expect(service).toMatch(/runCapability/);
    expect(service).not.toMatch(/NEXT_PUBLIC_/);
  });

  it("Shared core index does not pull React", () => {
    const idx = readFileSync(join(AI_ROOT, "index.ts"), "utf8");
    expect(idx).not.toMatch(/from ["']react["']/);
    for (const line of importLines(idx)) {
      expect(line).not.toMatch(/components\//);
    }
  });
});
