/**
 * Learning Catalog list performance contracts (Phase B).
 * Proves catalog cards use bounded course pages + count-only lesson refs
 * (no curriculum lesson payloads).
 */

import { describe, expect, it } from "vitest";
import {
  PUBLIC_CATALOG_DEFAULT_LIMIT,
  PUBLIC_CATALOG_MAX_LIMIT,
  listPublicCatalogCourses,
  loadPublicCourseBySlug,
} from "./publicCatalog";

type QueryCall = {
  table: string;
  select?: string;
  filters: string[];
  range?: [number, number];
};

function createCatalogClient(opts?: {
  courseCount?: number;
  includeDraft?: boolean;
}) {
  const courseCount = opts?.courseCount ?? 3;
  const calls: QueryCall[] = [];
  let active: QueryCall | null = null;

  const courses = Array.from({ length: courseCount }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: `Course ${i + 1}`,
    slug: `course-${i + 1}`,
    description: `Public course ${i + 1}`,
    difficulty: "beginner",
    estimated_duration_minutes: 60,
    marketplace_ready: false,
    branding_metadata: null,
    ai_metadata: { skills: [], outcomes: [] },
    status: "published",
    visibility: "public",
    position: i + 1,
  }));
  if (opts?.includeDraft) {
    courses.push({
      id: "00000000-0000-4000-8000-000000000099",
      name: "Draft Course",
      slug: "draft-course",
      description: "Should never appear",
      difficulty: "beginner",
      estimated_duration_minutes: 10,
      marketplace_ready: false,
      branding_metadata: null,
      ai_metadata: { skills: [], outcomes: [] },
      status: "draft",
      visibility: "public",
      position: 99,
    });
  }

  const sections = courses
    .filter((c) => c.status === "published")
    .flatMap((c, i) => [
      {
        id: `11111111-1111-4111-8111-${String(i * 2 + 1).padStart(12, "0")}`,
        course_id: c.id,
      },
      {
        id: `11111111-1111-4111-8111-${String(i * 2 + 2).padStart(12, "0")}`,
        course_id: c.id,
      },
    ]);

  const lessons = sections.flatMap((s, i) => [
    { section_id: s.id, id: `lesson-${i}-a`, name: "SHOULD_NOT_SELECT" },
    { section_id: s.id, id: `lesson-${i}-b`, name: "SHOULD_NOT_SELECT" },
  ]);

  function finish(data: unknown) {
    const api: Record<string, unknown> = {};
    const self = () => api;
    api.select = (cols: string) => {
      if (active) active.select = cols;
      return api;
    };
    api.eq = (col: string, val: unknown) => {
      active?.filters.push(`eq:${col}=${String(val)}`);
      return api;
    };
    api.in = (col: string, vals: unknown[]) => {
      active?.filters.push(`in:${col}=${vals.length}`);
      return api;
    };
    api.order = () => api;
    api.range = (from: number, to: number) => {
      if (active) active.range = [from, to];
      return api;
    };
    api.maybeSingle = () => Promise.resolve({ data, error: null });
    api.then = (
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise.resolve({ data, error: null }).then(resolve, reject);
    // unused but keep chainable
    void self;
    return api;
  }

  return {
    calls,
    from(table: string) {
      active = { table, filters: [] };
      calls.push(active);
      if (table === "learning_courses") {
        // Apply range if set later — handled when awaited via thenable capturing range
        const state = active;
        const api = finish(null);
        const originalRange = api.range as (f: number, t: number) => unknown;
        api.range = (from: number, to: number) => {
          state.range = [from, to];
          const sliced = courses
            .filter(
              (c) =>
                !state.filters.includes("eq:status=draft") &&
                c.status === "published" &&
                c.visibility === "public"
            )
            .slice(from, to + 1);
          // Replace thenable result
          api.then = (
            resolve: (v: unknown) => unknown,
            reject?: (e: unknown) => unknown
          ) =>
            Promise.resolve({ data: sliced, error: null }).then(resolve, reject);
          return api;
        };
        // Default without range (should not happen for list)
        api.then = (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) => {
          const published = courses.filter(
            (c) => c.status === "published" && c.visibility === "public"
          );
          return Promise.resolve({ data: published, error: null }).then(
            resolve,
            reject
          );
        };
        void originalRange;
        return api;
      }
      if (table === "learning_sections") {
        return finish(sections);
      }
      if (table === "learning_lessons") {
        // Return only what select requested — production selects section_id only
        return finish(lessons.map((l) => ({ section_id: l.section_id })));
      }
      if (table === "learning_course_settings") {
        return finish({ allow_self_enroll: true });
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("listPublicCatalogCourses — Phase B bounds & payload", () => {
  it("exports safe catalog limits", () => {
    expect(PUBLIC_CATALOG_DEFAULT_LIMIT).toBe(48);
    expect(PUBLIC_CATALOG_MAX_LIMIT).toBe(100);
    expect(PUBLIC_CATALOG_DEFAULT_LIMIT).toBeLessThanOrEqual(
      PUBLIC_CATALOG_MAX_LIMIT
    );
  });

  it("applies range limit and never selects lesson curriculum fields", async () => {
    const client = createCatalogClient({ courseCount: 5 });
    const cards = await listPublicCatalogCourses(client as never, {
      limit: 3,
      offset: 0,
    });

    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.module_count === 2)).toBe(true);
    expect(cards.every((c) => c.lesson_count === 4)).toBe(true);

    const courseCall = client.calls.find((c) => c.table === "learning_courses");
    expect(courseCall?.range).toEqual([0, 2]);
    expect(courseCall?.filters).toContain("eq:status=published");
    expect(courseCall?.filters).toContain("eq:visibility=public");

    const lessonCall = client.calls.find((c) => c.table === "learning_lessons");
    expect(lessonCall?.select).toBe("section_id");
    expect(lessonCall?.select).not.toMatch(/name|slug|description|content/i);

    // Fixed round-trips: courses + sections + lesson refs
    const tables = client.calls.map((c) => c.table);
    expect(tables.filter((t) => t === "learning_courses")).toHaveLength(1);
    expect(tables.filter((t) => t === "learning_sections")).toHaveLength(1);
    expect(tables.filter((t) => t === "learning_lessons")).toHaveLength(1);
  });

  it("clamps limit to max and rejects draft rows via query filters", async () => {
    const client = createCatalogClient({ courseCount: 2, includeDraft: true });
    const cards = await listPublicCatalogCourses(client as never, {
      limit: 999,
    });
    expect(client.calls[0]?.range).toEqual([0, PUBLIC_CATALOG_MAX_LIMIT - 1]);
    expect(cards.map((c) => c.slug)).not.toContain("draft-course");
    expect(cards.every((c) => c.name !== "Draft Course")).toBe(true);
  });

  it("keeps course landing as the curriculum path (separate from list)", async () => {
    const client = createCatalogClient({ courseCount: 1 });
    // Extend mock for landing path selects
    const baseFrom = client.from.bind(client);
    client.from = (table: string) => {
      const api = baseFrom(table) as Record<string, unknown>;
      if (table === "learning_courses") {
        api.maybeSingle = () =>
          Promise.resolve({
            data: {
              id: "00000000-0000-4000-8000-000000000001",
              name: "Course 1",
              slug: "course-1",
              description: "Public course 1",
              difficulty: "beginner",
              estimated_duration_minutes: 60,
              marketplace_ready: false,
              branding_metadata: null,
              ai_metadata: {},
              status: "published",
              visibility: "public",
            },
            error: null,
          });
        api.eq = () => api;
        api.select = () => api;
      }
      if (table === "learning_sections") {
        api.then = (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) =>
          Promise.resolve({
            data: [
              {
                id: "11111111-1111-4111-8111-000000000001",
                name: "Module 1",
                slug: "m1",
                position: 1,
              },
            ],
            error: null,
          }).then(resolve, reject);
        api.select = (cols: string) => {
          client.calls[client.calls.length - 1].select = cols;
          return api;
        };
        api.eq = () => api;
        api.order = () => api;
      }
      if (table === "learning_lessons") {
        api.then = (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) =>
          Promise.resolve({
            data: [
              {
                id: "l1",
                name: "Lesson A",
                slug: "a",
                position: 0,
                section_id: "11111111-1111-4111-8111-000000000001",
              },
            ],
            error: null,
          }).then(resolve, reject);
        api.select = (cols: string) => {
          client.calls[client.calls.length - 1].select = cols;
          return api;
        };
        api.in = () => api;
        api.eq = () => api;
        api.order = () => api;
      }
      if (table === "learning_course_settings") {
        api.maybeSingle = () =>
          Promise.resolve({ data: { allow_self_enroll: true }, error: null });
        api.select = () => api;
        api.eq = () => api;
      }
      return api;
    };

    const landing = await loadPublicCourseBySlug(client as never, "course-1");
    expect(landing).not.toBeNull();
    expect(landing!.curriculum[0].lessons[0].name).toBe("Lesson A");

    const lessonSelects = client.calls
      .filter((c) => c.table === "learning_lessons")
      .map((c) => c.select);
    expect(lessonSelects.some((s) => s?.includes("name"))).toBe(true);
  });
});

describe("catalog page wiring", () => {
  it("catalog page imports bounded list helper", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(process.cwd(), "app/learning/catalog/page.tsx"),
      "utf8"
    );
    expect(src).toMatch(/PUBLIC_CATALOG_DEFAULT_LIMIT/);
    expect(src).toMatch(/listPublicCatalogCourses/);
    expect(src).toMatch(/Promise\.all/);
    expect(src).not.toMatch(/loadPublicCourseBySlug/);
    expect(src).not.toMatch(/mapPublicCurriculum/);
  });
});
