import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  PAGE_DOMAINS,
  PAGE_REGISTRY,
  PAGE_REGISTRY_VERSION,
  domainCounts,
  getPageById,
  listAdminPages,
  listDynamicPages,
  listLegacyOrDeprecatedPages,
  listOrphanPages,
  listPublicPages,
} from "./index";

describe("UMTUBA Unified Page Registry V1", () => {
  it("exposes a stable registry version marker", () => {
    expect(PAGE_REGISTRY_VERSION).toBe("UMTUBA_UNIFIED_PAGE_REGISTRY_V1");
    expect(PAGE_REGISTRY.length).toBeGreaterThan(0);
  });

  it("every registry ID is unique", () => {
    const ids = PAGE_REGISTRY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every static path is unique", () => {
    const paths = PAGE_REGISTRY.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every entry has a valid domain", () => {
    const allowed = new Set<string>(PAGE_DOMAINS);
    for (const page of PAGE_REGISTRY) {
      expect(allowed.has(page.domain)).toBe(true);
    }
  });

  it("parent references are valid", () => {
    const ids = new Set(PAGE_REGISTRY.map((p) => p.id));
    for (const page of PAGE_REGISTRY) {
      if (page.parentId != null) {
        expect(ids.has(page.parentId)).toBe(true);
        expect(page.parentId).not.toBe(page.id);
      }
    }
  });

  it("deprecated pages are marked explicitly", () => {
    for (const page of PAGE_REGISTRY) {
      if (page.status === "deprecated") {
        expect(page.deprecated).toBe(true);
      }
      if (page.deprecated) {
        expect(
          page.status === "deprecated" || page.status === "legacy"
        ).toBe(true);
      }
    }
  });

  it("dynamic routes use a consistent bracket representation", () => {
    for (const page of PAGE_REGISTRY) {
      const hasBracket = /\[[^\]]+\]/.test(page.path);
      expect(page.dynamic).toBe(hasBracket);
      if (page.dynamic) {
        expect(page.path).toMatch(/\[[A-Za-z][A-Za-z0-9]*\]/);
      }
    }
  });

  it("no Commerce page is classified as Learning", () => {
    for (const page of PAGE_REGISTRY) {
      if (
        page.path.startsWith("/store") ||
        page.path.startsWith("/seller") ||
        page.path.startsWith("/advertise")
      ) {
        expect(page.domain).toBe("commerce");
        expect(page.domain).not.toBe("learning");
      }
    }
  });

  it("no Learning page is classified as Collaboration", () => {
    for (const page of PAGE_REGISTRY) {
      if (page.path === "/learning" || page.path.startsWith("/learning/")) {
        expect(page.domain).toBe("learning");
        expect(page.domain).not.toBe("collaboration");
      }
    }
  });

  it("admin-only pages are not marked public", () => {
    for (const page of PAGE_REGISTRY) {
      if (page.adminOnly) {
        expect(page.access).not.toBe("public");
        expect(page.authenticated).toBe(true);
      }
    }
  });

  it("registry entries map to real route source files", () => {
    for (const page of PAGE_REGISTRY) {
      const abs = join(process.cwd(), page.sourceFile);
      expect(existsSync(abs), page.sourceFile).toBe(true);
      expect(page.sourceFile.startsWith("app/")).toBe(true);
      expect(page.sourceFile.endsWith("/page.tsx") || page.sourceFile === "app/page.tsx").toBe(
        true
      );
    }
  });

  it("domain counts sum to registry size", () => {
    const counts = domainCounts();
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(PAGE_REGISTRY.length);
  });

  it("helper lists are consistent", () => {
    expect(listPublicPages().every((p) => p.access === "public")).toBe(true);
    expect(listAdminPages().length).toBeGreaterThan(0);
    expect(listDynamicPages().every((p) => p.dynamic)).toBe(true);
    expect(
      listLegacyOrDeprecatedPages().every(
        (p) =>
          p.legacy ||
          p.deprecated ||
          p.status === "legacy" ||
          p.status === "deprecated"
      )
    ).toBe(true);
    expect(listOrphanPages().every((p) => p.orphan === true)).toBe(true);
  });

  it("home and learning hubs resolve by id", () => {
    expect(getPageById("platform.home")?.path).toBe("/");
    expect(getPageById("learning")?.path).toBe("/learning");
  });
});
