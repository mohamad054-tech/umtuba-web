import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { LEARNING_PROGRAM_RPCS } from "./programsFoundation";
import { LEARNING_SPACE_RPCS } from "./spacesFoundation";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE,
  createLearningProgram,
  publishLearningProgram,
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
  });

  it("does not create a migration for this UI slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/No migrations/i);
  });
});

describe("Instructor Authoring Foundation V1 — RPC contracts", () => {
  it("uses existing space and program RPC names only", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).toContain("LEARNING_SPACE_RPCS");
    expect(src).toContain("LEARNING_PROGRAM_RPCS");
    expect(LEARNING_SPACE_RPCS.create).toBe("create_learning_space");
    expect(LEARNING_PROGRAM_RPCS.create).toBe("create_learning_program");
    expect(LEARNING_PROGRAM_RPCS.publish).toBe("publish_learning_program");
    expect(LEARNING_PROGRAM_RPCS.archive).toBe("archive_learning_program");
    expect(src).not.toMatch(/create_learning_course|create_learning_section/);
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
