import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learning intermittent blank-loading fix", () => {
  it("keeps Learning loading.tsx synchronous so the navy shell can paint immediately", () => {
    const loading = read("app/learning/loading.tsx");
    expect(loading).toMatch(/LearningRouteLoading/);
    expect(loading).not.toMatch(/resolveRequestLocale/);
    expect(loading).not.toMatch(/async function/);
    expect(loading).not.toMatch(/\bawait\b/);
  });

  it("does not recount the full public catalog on a course landing", () => {
    const loader = read("lib/learning/productization/loadSurfaces.ts");
    const courseFn = loader.slice(
      loader.indexOf("export async function loadLearningCourseSurface")
    );
    const nextExport = courseFn.indexOf("\nexport async function", 1);
    const body = nextExport > 0 ? courseFn.slice(0, nextExport) : courseFn;
    expect(body).toMatch(/listRelatedPublicCourses/);
    expect(body).toMatch(/getCachedPublicCourseBySlug/);
    expect(body).toMatch(/Promise\.all/);
    expect(body).not.toMatch(/listPublicCatalogCourses/);
    expect(body).not.toMatch(/getServerUser/);
  });

  it("loads the home catalog in parallel with viewer resolution", () => {
    const loader = read("lib/learning/productization/loadSurfaces.ts");
    const homeFn = loader.slice(
      loader.indexOf("export async function loadLearningHomeSurface")
    );
    const nextExport = homeFn.indexOf("\nexport async function", 1);
    const body = nextExport > 0 ? homeFn.slice(0, nextExport) : homeFn;
    expect(body).toMatch(/Promise\.all/);
    expect(body).toMatch(/getCachedPublicCatalog/);
    expect(body).toMatch(/getCachedLearningViewer/);
  });

  it("revalidates public catalog reads without a session cookie client", () => {
    const cache = read("lib/learning/productization/requestCache.ts");
    expect(cache).toMatch(/unstable_cache/);
    expect(cache).toMatch(/createLearningPublicClient/);
    expect(cache).not.toMatch(/from \"..\/..\/supabase\/server\"/);
  });
});
