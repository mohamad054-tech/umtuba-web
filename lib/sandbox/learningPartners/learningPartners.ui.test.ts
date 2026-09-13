import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("learning partner sandbox preview", () => {
  it("is an isolated Learning sandbox with RTL and certificate panel", () => {
    const page = readFileSync(
      join(ROOT, "app/sandbox/learning/partners/page.tsx"),
      "utf8"
    );
    const layout = readFileSync(
      join(ROOT, "app/sandbox/learning/partners/layout.tsx"),
      "utf8"
    );
    const links = readFileSync(
      join(ROOT, "lib/learning/partners/sandboxLinks.ts"),
      "utf8"
    );
    const panel = readFileSync(
      join(ROOT, "app/components/learning/partners/CertificateDetailsPanel.tsx"),
      "utf8"
    );
    expect(layout).toMatch(/robots: \{ index: false/);
    expect(page).toMatch(/dir=\{rtl \? "rtl" : "ltr"\}/);
    expect(links).toMatch(/\/sandbox\/learning\/partners/);
    expect(page).not.toMatch(/sandbox\/store\/cj-launch/);
    expect(panel).toMatch(/certificatePanel/);
    expect(page).not.toMatch(/OPENAI_API_KEY|CJ_API_KEY|IMPACT_API/);
  });
});
