import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { LEARNING_ACTIVITY_RPCS } from "./activitiesFoundation";
import { LEARNING_COURSE_RPCS } from "./coursesFoundation";
import { LEARNING_LESSON_RPCS } from "./lessonsFoundation";
import { LEARNING_PROGRAM_RPCS } from "./programsFoundation";
import { LEARNING_SECTION_RPCS } from "./sectionsFoundation";
import { LEARNING_SPACE_RPCS } from "./spacesFoundation";
import {
  LEARNING_ACTIVITY_REQUIRES_ACTIVE_SPACE,
  LEARNING_ACTIVITY_REQUIRES_VALID_COURSE,
  LEARNING_ACTIVITY_REQUIRES_VALID_LESSON,
  LEARNING_ACTIVITY_REQUIRES_VALID_PROGRAM,
  LEARNING_ACTIVITY_REQUIRES_VALID_SECTION,
  LEARNING_COURSE_REQUIRES_ACTIVE_SPACE,
  LEARNING_COURSE_REQUIRES_VALID_PROGRAM,
  LEARNING_INSTRUCTOR_ROUTES,
  LEARNING_LESSON_REQUIRES_ACTIVE_SPACE,
  LEARNING_LESSON_REQUIRES_VALID_COURSE,
  LEARNING_LESSON_REQUIRES_VALID_PROGRAM,
  LEARNING_LESSON_REQUIRES_VALID_SECTION,
  LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE,
  LEARNING_SECTION_REQUIRES_ACTIVE_SPACE,
  LEARNING_SECTION_REQUIRES_VALID_COURSE,
  LEARNING_SECTION_REQUIRES_VALID_PROGRAM,
  createLearningActivity,
  createLearningCourse,
  createLearningLesson,
  createLearningProgram,
  createLearningSection,
  publishLearningActivity,
  publishLearningCourse,
  publishLearningLesson,
  publishLearningProgram,
  publishLearningSection,
  updateLearningActivity,
  updateLearningActivitySettings,
  validateLearningActivityCompletionMode,
  validateLearningActivityConfig,
  validateLearningProgramName,
  validateLearningProgramSlug,
  validateLearningSpaceName,
  validateLearningSpaceSlug,
} from "./instructorAuthoring";

const ROOT = process.cwd();
const DOC =
  "docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function mockSpaceClient(status: "draft" | "active" | "archived") {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("learning_spaces");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "space-1",
                slug: "academy",
                name: "Academy",
                description: null,
                mode: "general_academy",
                status,
                visibility: "private",
                default_language: "en",
                owner_user_id: "user-1",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn(),
  };
}

function mockProgramCreateClient(opts: {
  programStatus: "draft" | "published" | "archived" | "suspended";
  spaceStatus: "draft" | "active" | "archived";
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "learning_programs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "prog-1",
                  space_id: "space-1",
                  slug: "bootcamp",
                  name: "Bootcamp",
                  description: null,
                  format: "self_paced",
                  status: opts.programStatus,
                  visibility: "private",
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      expect(table).toBe("learning_spaces");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "space-1",
                slug: "academy",
                name: "Academy",
                description: null,
                mode: "general_academy",
                status: opts.spaceStatus,
                visibility: "private",
                default_language: "en",
                owner_user_id: "user-1",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn(),
  };
}

function mockSectionCreateClient(opts: {
  courseStatus: "draft" | "published" | "archived" | "suspended";
  programStatus: "draft" | "published" | "archived" | "suspended";
  spaceStatus: "draft" | "active" | "archived";
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "learning_courses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "course-1",
                  program_id: "prog-1",
                  slug: "intro-ts",
                  name: "Intro TypeScript",
                  description: null,
                  status: opts.courseStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_programs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "prog-1",
                  space_id: "space-1",
                  slug: "bootcamp",
                  name: "Bootcamp",
                  description: null,
                  format: "self_paced",
                  status: opts.programStatus,
                  visibility: "private",
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      expect(table).toBe("learning_spaces");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "space-1",
                slug: "academy",
                name: "Academy",
                description: null,
                mode: "general_academy",
                status: opts.spaceStatus,
                visibility: "private",
                default_language: "en",
                owner_user_id: "user-1",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn(),
  };
}

function mockLessonCreateClient(opts: {
  sectionStatus: "draft" | "published" | "archived" | "suspended";
  courseStatus: "draft" | "published" | "archived" | "suspended";
  programStatus: "draft" | "published" | "archived" | "suspended";
  spaceStatus: "draft" | "active" | "archived";
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "learning_sections") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "sec-1",
                  course_id: "course-1",
                  slug: "getting-started",
                  name: "Getting Started",
                  description: null,
                  status: opts.sectionStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_courses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "course-1",
                  program_id: "prog-1",
                  slug: "intro-ts",
                  name: "Intro TypeScript",
                  description: null,
                  status: opts.courseStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_programs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "prog-1",
                  space_id: "space-1",
                  slug: "bootcamp",
                  name: "Bootcamp",
                  description: null,
                  format: "self_paced",
                  status: opts.programStatus,
                  visibility: "private",
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      expect(table).toBe("learning_spaces");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "space-1",
                slug: "academy",
                name: "Academy",
                description: null,
                mode: "general_academy",
                status: opts.spaceStatus,
                visibility: "private",
                default_language: "en",
                owner_user_id: "user-1",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn(),
  };
}

function mockActivityCreateClient(opts: {
  lessonStatus: "draft" | "published" | "archived" | "suspended";
  sectionStatus: "draft" | "published" | "archived" | "suspended";
  courseStatus: "draft" | "published" | "archived" | "suspended";
  programStatus: "draft" | "published" | "archived" | "suspended";
  spaceStatus: "draft" | "active" | "archived";
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "learning_lessons") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "les-1",
                  section_id: "sec-1",
                  slug: "lesson-1",
                  name: "Lesson 1",
                  description: null,
                  status: opts.lessonStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_sections") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "sec-1",
                  course_id: "course-1",
                  slug: "getting-started",
                  name: "Getting Started",
                  description: null,
                  status: opts.sectionStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_courses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "course-1",
                  program_id: "prog-1",
                  slug: "intro-ts",
                  name: "Intro TypeScript",
                  description: null,
                  status: opts.courseStatus,
                  visibility: "private",
                  position: 0,
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "learning_programs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "prog-1",
                  space_id: "space-1",
                  slug: "bootcamp",
                  name: "Bootcamp",
                  description: null,
                  format: "self_paced",
                  status: opts.programStatus,
                  visibility: "private",
                  default_language: "en",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  published_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      expect(table).toBe("learning_spaces");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "space-1",
                slug: "academy",
                name: "Academy",
                description: null,
                mode: "general_academy",
                status: opts.spaceStatus,
                visibility: "private",
                default_language: "en",
                owner_user_id: "user-1",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn(),
  };
}

describe("Instructor Authoring Foundation V1 — files & routes", () => {
  it("ships module, tests, docs, and instructor routes", () => {
    expect(existsSync(join(ROOT, "lib/learning/instructorAuthoring.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "app/learning/instructor/page.tsx"))).toBe(
      true
    );
    expect(
      existsSync(join(ROOT, "app/learning/instructor/spaces/new/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/spaces/[spaceId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/spaces/[spaceId]/programs/new/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/programs/[programId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/programs/[programId]/courses/new/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/courses/[courseId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/courses/[courseId]/sections/new/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/sections/[sectionId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/sections/[sectionId]/lessons/new/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/lessons/[lessonId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "app/learning/instructor/lessons/[lessonId]/activities/new/page.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/activities/[activityId]/page.tsx")
      )
    ).toBe(true);
    expect(existsSync(join(ROOT, "app/learning/instructor/actions.ts"))).toBe(
      true
    );
  });

  it("documents instructor routes under /learning/instructor", () => {
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).toBe("/learning/instructor");
    expect(LEARNING_INSTRUCTOR_ROUTES.spaceNew).toBe(
      "/learning/instructor/spaces/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.space("s1")).toBe(
      "/learning/instructor/spaces/s1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.programNew("s1")).toBe(
      "/learning/instructor/spaces/s1/programs/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.program("p1")).toBe(
      "/learning/instructor/programs/p1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.courseNew("p1")).toBe(
      "/learning/instructor/programs/p1/courses/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.course("c1")).toBe(
      "/learning/instructor/courses/c1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.sectionNew("c1")).toBe(
      "/learning/instructor/courses/c1/sections/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.section("sec1")).toBe(
      "/learning/instructor/sections/sec1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.lessonNew("sec1")).toBe(
      "/learning/instructor/sections/sec1/lessons/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.lesson("les1")).toBe(
      "/learning/instructor/lessons/les1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.activityNew("les1")).toBe(
      "/learning/instructor/lessons/les1/activities/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.activity("act1")).toBe(
      "/learning/instructor/activities/act1"
    );
  });

  it("does not create a migration for this UI slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/No migrations/i);
  });
});

describe("Instructor Authoring Foundation V1 — RPC contracts", () => {
  it("uses existing space through activity RPC names only", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).toContain("LEARNING_SPACE_RPCS");
    expect(src).toContain("LEARNING_PROGRAM_RPCS");
    expect(src).toContain("LEARNING_COURSE_RPCS");
    expect(src).toContain("LEARNING_SECTION_RPCS");
    expect(src).toContain("LEARNING_LESSON_RPCS");
    expect(src).toContain("LEARNING_ACTIVITY_RPCS");
    expect(LEARNING_SPACE_RPCS.create).toBe("create_learning_space");
    expect(LEARNING_PROGRAM_RPCS.create).toBe("create_learning_program");
    expect(LEARNING_COURSE_RPCS.create).toBe("create_learning_course");
    expect(LEARNING_COURSE_RPCS.publish).toBe("publish_learning_course");
    expect(LEARNING_COURSE_RPCS.archive).toBe("archive_learning_course");
    expect(LEARNING_SECTION_RPCS.create).toBe("create_learning_section");
    expect(LEARNING_SECTION_RPCS.publish).toBe("publish_learning_section");
    expect(LEARNING_SECTION_RPCS.archive).toBe("archive_learning_section");
    expect(LEARNING_LESSON_RPCS.create).toBe("create_learning_lesson");
    expect(LEARNING_LESSON_RPCS.publish).toBe("publish_learning_lesson");
    expect(LEARNING_LESSON_RPCS.archive).toBe("archive_learning_lesson");
    expect(LEARNING_ACTIVITY_RPCS.create).toBe("create_learning_activity");
    expect(LEARNING_ACTIVITY_RPCS.update).toBe("update_learning_activity");
    expect(LEARNING_ACTIVITY_RPCS.updateSettings).toBe(
      "update_learning_activity_settings"
    );
    expect(LEARNING_ACTIVITY_RPCS.publish).toBe("publish_learning_activity");
    expect(LEARNING_ACTIVITY_RPCS.archive).toBe("archive_learning_activity");
    expect(src).not.toMatch(
      /create_learning_lesson_content_block|create_learning_question/
    );
  });

  it("forbids service role and does not redesign RPCs", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).toMatch(/No service role/i);
    expect(src).not.toMatch(/createServiceRole|service_role|SERVICE_ROLE/);
    expect(src).not.toMatch(/create or replace function/i);
  });

  it("does not modify learner routes", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).not.toContain("LEARNING_LEARNER_ROUTES");
    const learnerPage = read("app/learning/page.tsx");
    expect(learnerPage).toContain("LEARNING_LEARNER_ROUTES");
    expect(learnerPage).not.toContain("instructorAuthoring");
  });
});

describe("Instructor Authoring Foundation V1 — validation", () => {
  it("validates space slug like SQL", () => {
    expect(validateLearningSpaceSlug("ab")).toBeTruthy();
    expect(validateLearningSpaceSlug("ok-space")).toBeNull();
  });

  it("validates space and program names", () => {
    expect(validateLearningSpaceName("UMTUBA Academy")).toBeNull();
    expect(validateLearningProgramSlug("prog-01")).toBeNull();
    expect(validateLearningProgramName("")).toBeTruthy();
    expect(validateLearningProgramName("Bootcamp")).toBeNull();
  });
});

describe("Instructor Authoring Foundation V1 — Phase 4A program wrappers", () => {
  it("create program succeeds under an active space", async () => {
    const client = mockSpaceClient("active");
    client.rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe(LEARNING_PROGRAM_RPCS.create);
      expect(args.p_space_id).toBe("space-1");
      expect(args.p_slug).toBe("bootcamp");
      return {
        data: {
          program_id: "prog-1",
          space_id: "space-1",
          status: "draft",
        },
        error: null,
      };
    });

    const result = await createLearningProgram(client as never, {
      space_id: "space-1",
      slug: "Bootcamp",
      name: "Bootcamp",
      format: "self_paced",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        program_id: "prog-1",
        space_id: "space-1",
        status: "draft",
      },
    });
  });

  it("create program blocks when space is not active", async () => {
    const client = mockSpaceClient("draft");
    client.rpc = vi.fn();

    const result = await createLearningProgram(client as never, {
      space_id: "space-1",
      slug: "bootcamp",
      name: "Bootcamp",
      format: "self_paced",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create program passes through RPC errors", async () => {
    const client = mockSpaceClient("active");
    client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not allowed to create programs in this space" },
    }));

    const result = await createLearningProgram(client as never, {
      space_id: "space-1",
      slug: "bootcamp",
      name: "Bootcamp",
      format: "self_paced",
    });

    expect(result).toEqual({
      ok: false,
      message: "Not allowed to create programs in this space",
    });
  });

  it("publish program succeeds and passes through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe(LEARNING_PROGRAM_RPCS.publish);
        expect(args.p_program_id).toBe("prog-1");
        return {
          data: { program_id: "prog-1", status: "published" },
          error: null,
        };
      }),
    };

    const ok = await publishLearningProgram(okClient as never, "prog-1");
    expect(ok).toEqual({
      ok: true,
      data: { program_id: "prog-1", status: "published" },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Only draft programs can be published" },
      })),
    };
    const failed = await publishLearningProgram(errClient as never, "prog-1");
    expect(failed).toEqual({
      ok: false,
      message: "Only draft programs can be published",
    });
  });
});

describe("Instructor Authoring Foundation V1 — Phase 4B course wrappers", () => {
  it("create course succeeds under draft|published program and active space", async () => {
    const client = mockProgramCreateClient({
      programStatus: "draft",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe(LEARNING_COURSE_RPCS.create);
      expect(args.p_program_id).toBe("prog-1");
      expect(args.p_slug).toBe("intro-ts");
      return {
        data: {
          course_id: "course-1",
          program_id: "prog-1",
          status: "draft",
          position: 0,
        },
        error: null,
      };
    });

    const result = await createLearningCourse(client as never, {
      program_id: "prog-1",
      slug: "intro-ts",
      name: "Intro TypeScript",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        course_id: "course-1",
        program_id: "prog-1",
        status: "draft",
        position: 0,
      },
    });
  });

  it("create course blocks when program is archived", async () => {
    const client = mockProgramCreateClient({
      programStatus: "archived",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningCourse(client as never, {
      program_id: "prog-1",
      slug: "intro-ts",
      name: "Intro TypeScript",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_COURSE_REQUIRES_VALID_PROGRAM,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create course blocks when space is not active", async () => {
    const client = mockProgramCreateClient({
      programStatus: "published",
      spaceStatus: "draft",
    });
    client.rpc = vi.fn();

    const result = await createLearningCourse(client as never, {
      program_id: "prog-1",
      slug: "intro-ts",
      name: "Intro TypeScript",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_COURSE_REQUIRES_ACTIVE_SPACE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create course passes through RPC errors", async () => {
    const client = mockProgramCreateClient({
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not allowed to create courses in this program" },
    }));

    const result = await createLearningCourse(client as never, {
      program_id: "prog-1",
      slug: "intro-ts",
      name: "Intro TypeScript",
    });

    expect(result).toEqual({
      ok: false,
      message: "Not allowed to create courses in this program",
    });
  });

  it("publish course succeeds and passes through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe(LEARNING_COURSE_RPCS.publish);
        expect(args.p_course_id).toBe("course-1");
        return {
          data: { course_id: "course-1", status: "published" },
          error: null,
        };
      }),
    };

    const ok = await publishLearningCourse(okClient as never, "course-1");
    expect(ok).toEqual({
      ok: true,
      data: { course_id: "course-1", status: "published" },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Only draft courses can be published" },
      })),
    };
    const failed = await publishLearningCourse(errClient as never, "course-1");
    expect(failed).toEqual({
      ok: false,
      message: "Only draft courses can be published",
    });
  });
});

describe("Instructor Authoring Foundation V1 — Phase 4C section wrappers", () => {
  it("create section succeeds under valid course, program, and active space", async () => {
    const client = mockSectionCreateClient({
      courseStatus: "draft",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe(LEARNING_SECTION_RPCS.create);
      expect(args.p_course_id).toBe("course-1");
      expect(args.p_slug).toBe("getting-started");
      return {
        data: {
          section_id: "sec-1",
          course_id: "course-1",
          status: "draft",
          position: 0,
        },
        error: null,
      };
    });

    const result = await createLearningSection(client as never, {
      course_id: "course-1",
      slug: "getting-started",
      name: "Getting Started",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        section_id: "sec-1",
        course_id: "course-1",
        status: "draft",
        position: 0,
      },
    });
  });

  it("create section blocks when course is archived", async () => {
    const client = mockSectionCreateClient({
      courseStatus: "archived",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningSection(client as never, {
      course_id: "course-1",
      slug: "getting-started",
      name: "Getting Started",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_SECTION_REQUIRES_VALID_COURSE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create section blocks when program is archived", async () => {
    const client = mockSectionCreateClient({
      courseStatus: "draft",
      programStatus: "archived",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningSection(client as never, {
      course_id: "course-1",
      slug: "getting-started",
      name: "Getting Started",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_SECTION_REQUIRES_VALID_PROGRAM,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create section blocks when space is not active", async () => {
    const client = mockSectionCreateClient({
      courseStatus: "published",
      programStatus: "draft",
      spaceStatus: "draft",
    });
    client.rpc = vi.fn();

    const result = await createLearningSection(client as never, {
      course_id: "course-1",
      slug: "getting-started",
      name: "Getting Started",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_SECTION_REQUIRES_ACTIVE_SPACE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create section passes through RPC errors", async () => {
    const client = mockSectionCreateClient({
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not allowed to create sections in this course" },
    }));

    const result = await createLearningSection(client as never, {
      course_id: "course-1",
      slug: "getting-started",
      name: "Getting Started",
    });

    expect(result).toEqual({
      ok: false,
      message: "Not allowed to create sections in this course",
    });
  });

  it("publish section succeeds and passes through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe(LEARNING_SECTION_RPCS.publish);
        expect(args.p_section_id).toBe("sec-1");
        return {
          data: { section_id: "sec-1", status: "published" },
          error: null,
        };
      }),
    };

    const ok = await publishLearningSection(okClient as never, "sec-1");
    expect(ok).toEqual({
      ok: true,
      data: { section_id: "sec-1", status: "published" },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Only draft sections can be published" },
      })),
    };
    const failed = await publishLearningSection(errClient as never, "sec-1");
    expect(failed).toEqual({
      ok: false,
      message: "Only draft sections can be published",
    });
  });
});

describe("Instructor Authoring Foundation V1 — Phase 4D lesson wrappers", () => {
  it("create lesson succeeds under valid section chain and active space", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "draft",
      courseStatus: "published",
      programStatus: "draft",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe(LEARNING_LESSON_RPCS.create);
      expect(args.p_section_id).toBe("sec-1");
      expect(args.p_slug).toBe("lesson-1");
      return {
        data: {
          lesson_id: "les-1",
          section_id: "sec-1",
          status: "draft",
          position: 0,
        },
        error: null,
      };
    });

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        lesson_id: "les-1",
        section_id: "sec-1",
        status: "draft",
        position: 0,
      },
    });
  });

  it("create lesson blocks when section is archived", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "archived",
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_LESSON_REQUIRES_VALID_SECTION,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create lesson blocks when course is archived", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "draft",
      courseStatus: "archived",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_LESSON_REQUIRES_VALID_COURSE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create lesson blocks when program is archived", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "published",
      courseStatus: "draft",
      programStatus: "archived",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_LESSON_REQUIRES_VALID_PROGRAM,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create lesson blocks when space is not active", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "published",
      courseStatus: "published",
      programStatus: "draft",
      spaceStatus: "draft",
    });
    client.rpc = vi.fn();

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_LESSON_REQUIRES_ACTIVE_SPACE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create lesson passes through RPC errors", async () => {
    const client = mockLessonCreateClient({
      sectionStatus: "published",
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not allowed to create lessons in this section" },
    }));

    const result = await createLearningLesson(client as never, {
      section_id: "sec-1",
      slug: "lesson-1",
      name: "Lesson 1",
    });

    expect(result).toEqual({
      ok: false,
      message: "Not allowed to create lessons in this section",
    });
  });

  it("publish lesson succeeds and passes through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe(LEARNING_LESSON_RPCS.publish);
        expect(args.p_lesson_id).toBe("les-1");
        return {
          data: { lesson_id: "les-1", status: "published" },
          error: null,
        };
      }),
    };

    const ok = await publishLearningLesson(okClient as never, "les-1");
    expect(ok).toEqual({
      ok: true,
      data: { lesson_id: "les-1", status: "published" },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Only draft lessons can be published" },
      })),
    };
    const failed = await publishLearningLesson(errClient as never, "les-1");
    expect(failed).toEqual({
      ok: false,
      message: "Only draft lessons can be published",
    });
  });
});

describe("Instructor Authoring Foundation V1 — Phase 4E activity wrappers", () => {
  it("validates completion_mode and config", () => {
    expect(validateLearningActivityCompletionMode("view")).toBeNull();
    expect(validateLearningActivityCompletionMode("submit")).toBeNull();
    expect(validateLearningActivityCompletionMode("score")).toBeNull();
    expect(validateLearningActivityCompletionMode("manual")).toBeNull();
    expect(validateLearningActivityCompletionMode("auto")).toBe(
      "Invalid completion_mode"
    );
    expect(validateLearningActivityConfig({ hint: "ok", flags: [1, "a"] })).toBeNull();
    expect(validateLearningActivityConfig([])).toBe(
      "Activity config must be a JSON object"
    );
    expect(validateLearningActivityConfig({ nested: { a: 1 } })).toBe(
      "Activity config.nested must be a scalar or short array"
    );
  });

  it("create activity succeeds under valid lesson chain and active space", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "draft",
      sectionStatus: "published",
      courseStatus: "draft",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === LEARNING_ACTIVITY_RPCS.create) {
        expect(args.p_lesson_id).toBe("les-1");
        expect(args.p_type).toBe("quiz");
        expect(args.p_slug).toBe("practice-quiz");
        return {
          data: {
            activity_id: "act-1",
            lesson_id: "les-1",
            type: "quiz",
            status: "draft",
            position: 0,
          },
          error: null,
        };
      }
      expect(name).toBe(LEARNING_ACTIVITY_RPCS.updateSettings);
      expect(args.p_activity_id).toBe("act-1");
      expect(args.p_completion_mode).toBe("submit");
      return {
        data: { activity_id: "act-1", settings_updated: true },
        error: null,
      };
    });

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
      completion_mode: "submit",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        activity_id: "act-1",
        lesson_id: "les-1",
        type: "quiz",
        status: "draft",
        position: 0,
      },
    });
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it("create activity blocks when lesson is archived", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "archived",
      sectionStatus: "published",
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_ACTIVITY_REQUIRES_VALID_LESSON,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity blocks when section is archived", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "draft",
      sectionStatus: "archived",
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_ACTIVITY_REQUIRES_VALID_SECTION,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity blocks when course is archived", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "published",
      sectionStatus: "draft",
      courseStatus: "archived",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_ACTIVITY_REQUIRES_VALID_COURSE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity blocks when program is archived", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "published",
      sectionStatus: "published",
      courseStatus: "draft",
      programStatus: "archived",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_ACTIVITY_REQUIRES_VALID_PROGRAM,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity blocks when space is not active", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "published",
      sectionStatus: "published",
      courseStatus: "published",
      programStatus: "draft",
      spaceStatus: "draft",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: LEARNING_ACTIVITY_REQUIRES_ACTIVE_SPACE,
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity rejects invalid completion_mode before RPC", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "draft",
      sectionStatus: "draft",
      courseStatus: "draft",
      programStatus: "draft",
      spaceStatus: "active",
    });
    client.rpc = vi.fn();

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
      completion_mode: "auto" as never,
    });

    expect(result).toEqual({
      ok: false,
      message: "Invalid completion_mode",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("create activity passes through RPC errors", async () => {
    const client = mockActivityCreateClient({
      lessonStatus: "published",
      sectionStatus: "published",
      courseStatus: "published",
      programStatus: "published",
      spaceStatus: "active",
    });
    client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Not allowed to create activities in this lesson" },
    }));

    const result = await createLearningActivity(client as never, {
      lesson_id: "les-1",
      type: "quiz",
      slug: "practice-quiz",
      name: "Practice Quiz",
    });

    expect(result).toEqual({
      ok: false,
      message: "Not allowed to create activities in this lesson",
    });
  });

  it("update activity and settings succeed and pass through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        if (name === LEARNING_ACTIVITY_RPCS.update) {
          expect(args.p_activity_id).toBe("act-1");
          expect(args.p_name).toBe("Updated Quiz");
          return {
            data: { activity_id: "act-1", updated: true },
            error: null,
          };
        }
        expect(name).toBe(LEARNING_ACTIVITY_RPCS.updateSettings);
        expect(args.p_completion_mode).toBe("score");
        expect(args.p_config).toEqual({ attempts: 2 });
        return {
          data: { activity_id: "act-1", settings_updated: true },
          error: null,
        };
      }),
    };

    const updated = await updateLearningActivity(okClient as never, {
      activity_id: "act-1",
      name: "Updated Quiz",
    });
    expect(updated).toEqual({
      ok: true,
      data: { activity_id: "act-1", updated: true },
    });

    const settings = await updateLearningActivitySettings(okClient as never, {
      activity_id: "act-1",
      completion_mode: "score",
      config: { attempts: 2 },
    });
    expect(settings).toEqual({
      ok: true,
      data: { activity_id: "act-1", settings_updated: true },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Not allowed to update this activity" },
      })),
    };
    const failed = await updateLearningActivity(errClient as never, {
      activity_id: "act-1",
      name: "Nope",
    });
    expect(failed).toEqual({
      ok: false,
      message: "Not allowed to update this activity",
    });
  });

  it("publish activity succeeds and passes through errors", async () => {
    const okClient = {
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe(LEARNING_ACTIVITY_RPCS.publish);
        expect(args.p_activity_id).toBe("act-1");
        return {
          data: { activity_id: "act-1", status: "published" },
          error: null,
        };
      }),
    };

    const ok = await publishLearningActivity(okClient as never, "act-1");
    expect(ok).toEqual({
      ok: true,
      data: { activity_id: "act-1", status: "published" },
    });

    const errClient = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "Only draft activities can be published" },
      })),
    };
    const failed = await publishLearningActivity(errClient as never, "act-1");
    expect(failed).toEqual({
      ok: false,
      message: "Only draft activities can be published",
    });
  });
});
