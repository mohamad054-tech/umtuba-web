import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("sandbox route authorization", () => {
  it("gates hub and section pages through the server access resolver", () => {
    const hub = read("app/sandbox/business-preview/page.tsx");
    const section = read("app/sandbox/business-preview/[...section]/page.tsx");
    expect(hub).toMatch(/resolveBusinessSandboxAccess/);
    expect(section).toMatch(/resolveBusinessSandboxAccess/);
    expect(hub).toMatch(/allowed=\{access\.ok\}/);
    expect(section).toMatch(/allowed=\{access\.ok\}/);
  });

  it("marks the sandbox layout noindex", () => {
    const layout = read("app/sandbox/business-preview/layout.tsx");
    expect(layout).toMatch(/index:\s*false/);
    expect(layout).toMatch(/follow:\s*false/);
  });

  it("does not treat STORE_DEMO_PREVIEW as a grant", () => {
    const gate = read("lib/sandbox/access/gate.ts");
    expect(gate).not.toMatch(/STORE_DEMO_PREVIEW\s*===\s*["']1["']/);
    expect(gate).toMatch(/NODE_ENV !== production is not a grant/);
  });
});
