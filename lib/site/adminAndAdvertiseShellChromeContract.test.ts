import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walkTsx(relDir: string): string[] {
  const abs = join(ROOT, relDir);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTsx(join(relDir, name)));
    else if (/\.(tsx|ts)$/.test(name) && !name.includes("Shell")) {
      out.push(join(relDir, name).replace(/\\/g, "/"));
    }
  }
  return out;
}

function assertFullBleed(shellRel: string, maxClassFragment: string) {
  const src = read(shellRel);
  const navIdx = src.indexOf("<AppTopNav");
  const constrainIdx = src.indexOf(maxClassFragment);
  expect(navIdx, shellRel).toBeGreaterThan(-1);
  expect(constrainIdx, shellRel).toBeGreaterThan(-1);
  expect(navIdx, shellRel).toBeLessThan(constrainIdx);
}

describe("AdvertiseShell platform chrome contract", () => {
  it("keeps AppTopNav full-bleed and demotes page intros to h2", () => {
    assertFullBleed(
      "app/advertise/AdvertiseShell.tsx",
      'className="mx-auto max-w-3xl'
    );
    for (const rel of walkTsx("app/advertise")) {
      const src = read(rel);
      expect(src.includes("<h1"), `${rel} must not declare <h1>`).toBe(false);
    }
  });
});

describe("PrivateAiShell platform chrome contract", () => {
  it("keeps AppTopNav full-bleed and demotes page intros to h2", () => {
    assertFullBleed(
      "app/admin/private-ai/PrivateAiShell.tsx",
      'className="mx-auto max-w-5xl'
    );
    for (const rel of walkTsx("app/admin/private-ai")) {
      const src = read(rel);
      expect(src.includes("<h1"), `${rel} must not declare <h1>`).toBe(false);
    }
  });
});

describe("Knowledge + AI Data shells platform chrome contract", () => {
  it("keeps AppTopNav full-bleed on both foundation shells", () => {
    assertFullBleed(
      "app/admin/knowledge/KnowledgeAcquisitionShell.tsx",
      'className="mx-auto max-w-5xl'
    );
    assertFullBleed(
      "app/admin/ai-data/AiDataPlatformShell.tsx",
      'className="mx-auto max-w-5xl'
    );
  });

  it("demotes Knowledge and AI Data page intros to h2", () => {
    for (const rel of [
      ...walkTsx("app/admin/knowledge"),
      ...walkTsx("app/admin/ai-data"),
    ]) {
      const src = read(rel);
      expect(src.includes("<h1"), `${rel} must not declare <h1>`).toBe(false);
    }
  });
});

describe("Create video form single-H1 under AppTopNav", () => {
  it("uses h2 for upload intro (page AppTopNav owns H1)", () => {
    const form = read("app/create/video/CreateVideoForm.tsx");
    expect(form).toMatch(/Upload a video\s*<\/h2>/);
    expect(form.includes("<h1")).toBe(false);
  });
});

describe("Translation Studio / Admin Ads / Admin Store shell chrome", () => {
  it("keeps AppTopNav full-bleed on Translation Studio, Ads admin, Store admin", () => {
    assertFullBleed(
      "app/admin/translation-studio/TranslationStudioShell.tsx",
      'className="mx-auto max-w-5xl'
    );
    assertFullBleed(
      "app/admin/ads/AdminAdsShell.tsx",
      'className="mx-auto max-w-5xl'
    );
    assertFullBleed(
      "app/admin/store/AdminStoreShell.tsx",
      'className="mx-auto max-w-5xl'
    );
  });

  it("demotes nested page intros to h2 under those shells", () => {
    for (const rel of [
      ...walkTsx("app/admin/translation-studio"),
      ...walkTsx("app/admin/ads"),
      ...walkTsx("app/admin/store"),
    ]) {
      const src = read(rel);
      expect(src.includes("<h1"), `${rel} must not declare <h1>`).toBe(false);
    }
  });
});
