import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSandboxSection, sandboxHref } from "../paths";
import { PROSPECTIVE_COMMERCE_PARTNERS } from "../fixtures/partners";
import { assertProspectiveNeverActive } from "../fixtures/partners";

const ROOT = process.cwd();

describe("sandbox store shopper path", () => {
  it("exposes clickable P1–P14 routes under the private hub", () => {
    const routes = [
      ["store"],
      ["store", "catalog"],
      ["store", "favorites"],
      ["store", "cart"],
      ["store", "checkout"],
      ["store", "orders"],
      ["store", "returns"],
      ["store", "seller"],
      ["store", "seller", "products"],
      ["store", "seller", "analytics"],
      ["store", "seller", "finance"],
      ["store", "admin"],
      ["store", "providers"],
      ["store", "partners"],
      ["store", "economics"],
      ["store", "products", "umtuba-demo-studio-earbuds"],
      ["store", "orders", "sandbox-ord-1001"],
    ];
    expect(parseSandboxSection(["store"]).kind).toBe("section");
    expect(parseSandboxSection(["store", "products", "umtuba-demo-studio-earbuds"])).toEqual({
      kind: "product",
      slug: "umtuba-demo-studio-earbuds",
    });
    expect(parseSandboxSection(["store", "orders", "sandbox-ord-1001"])).toEqual({
      kind: "order",
      id: "sandbox-ord-1001",
    });
    for (const segments of routes) {
      expect(parseSandboxSection(segments).kind).not.toBe("unknown");
    }
    expect(sandboxHref("store/checkout")).toBe("/sandbox/business-preview/store/checkout");
  });

  it("keeps prospective commerce names locked", () => {
    expect(PROSPECTIVE_COMMERCE_PARTNERS).toHaveLength(8);
    for (const partner of PROSPECTIVE_COMMERCE_PARTNERS) {
      expect(assertProspectiveNeverActive(partner)).toBe(true);
      expect(partner.status).toBe("PROSPECTIVE");
    }
  });

  it("does not graft the marketplace onto public /store", () => {
    const publicStore = readFileSync(join(ROOT, "app/store/page.tsx"), "utf8");
    expect(publicStore).not.toMatch(/lib\/sandbox\/store/);
    expect(publicStore).not.toMatch(/StoreExperience/);
  });
});
