import { describe, expect, it, vi } from "vitest";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  createInstructorCourse,
  createInstructorProgram,
  createInstructorSpace,
  sanitizeBootstrapRpcError,
  slugifyBootstrapName,
  validateCreateCourseInput,
  validateCreateProgramInput,
  validateCreateSpaceInput,
} from "./instructorBootstrap";
import { LEARNING_SPACE_RPCS } from "./spacesFoundation";
import { LEARNING_PROGRAM_RPCS } from "./programsFoundation";
import { LEARNING_COURSE_RPCS } from "./coursesFoundation";

const SPACE_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const COURSE_ID = "33333333-3333-4333-8333-333333333333";

describe("Instructor Bootstrap — routes", () => {
  it("connects course create to course-centric authoring", () => {
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub).toBe(
      "/learning/instructor/bootstrap"
    );
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew).toBe(
      "/learning/instructor/spaces/new"
    );
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(SPACE_ID)).toBe(
      `/learning/instructor/spaces/${SPACE_ID}/programs/new`
    );
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(PROGRAM_ID)).toBe(
      `/learning/instructor/programs/${PROGRAM_ID}/courses/new`
    );
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.authoring(COURSE_ID)).toBe(
      `/learning/instructor/courses/${COURSE_ID}`
    );
  });
});

describe("Instructor Bootstrap — slugify / validation", () => {
  it("slugifies display names", () => {
    expect(slugifyBootstrapName("Acme Academy")).toBe("acme-academy");
    expect(slugifyBootstrapName("  Hi  ")).toBe("hix");
  });

  it("validates space create input", () => {
    const ok = validateCreateSpaceInput({
      name: "Acme",
      mode: "general_academy",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.slug).toBe("acme");
      expect(ok.data.publish).toBe(true);
    }

    const bad = validateCreateSpaceInput({
      name: "",
      mode: "general_academy",
    });
    expect(bad.ok).toBe(false);
  });

  it("validates program and course parents", () => {
    expect(
      validateCreateProgramInput({
        space_id: "bad",
        name: "Track",
        format: "self_paced",
      }).ok
    ).toBe(false);
    expect(
      validateCreateProgramInput({
        space_id: SPACE_ID,
        name: "Track",
        format: "self_paced",
      }).ok
    ).toBe(true);

    expect(
      validateCreateCourseInput({
        program_id: PROGRAM_ID,
        name: "Foundations",
      }).ok
    ).toBe(true);
  });
});

describe("Instructor Bootstrap — error sanitizer", () => {
  it("maps auth / active / unique failures", () => {
    expect(sanitizeBootstrapRpcError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(
      sanitizeBootstrapRpcError("Learning space must be active for program changes")
    ).toMatch(/Activate/i);
    expect(sanitizeBootstrapRpcError("duplicate key unique")).toMatch(/slug/i);
  });
});

describe("Instructor Bootstrap — RPC adapters", () => {
  it("creates space then publishes by default", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === LEARNING_SPACE_RPCS.create) {
        return { data: { space_id: SPACE_ID }, error: null };
      }
      if (name === LEARNING_SPACE_RPCS.publish) {
        return { data: { space_id: SPACE_ID, status: "active" }, error: null };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });
    const supabase = { rpc } as never;
    const result = await createInstructorSpace(supabase, {
      name: "Acme Academy",
      mode: "general_academy",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.space_id).toBe(SPACE_ID);
    expect(rpc).toHaveBeenCalledWith(
      LEARNING_SPACE_RPCS.create,
      expect.objectContaining({ p_slug: "acme-academy" })
    );
    expect(rpc).toHaveBeenCalledWith(LEARNING_SPACE_RPCS.publish, {
      p_space_id: SPACE_ID,
    });
  });

  it("creates program and course via foundation RPCs", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === LEARNING_PROGRAM_RPCS.create) {
        return { data: { program_id: PROGRAM_ID }, error: null };
      }
      if (name === LEARNING_COURSE_RPCS.create) {
        return { data: { course_id: COURSE_ID }, error: null };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });
    const supabase = { rpc } as never;

    const program = await createInstructorProgram(supabase, {
      space_id: SPACE_ID,
      name: "Design Track",
      format: "self_paced",
    });
    expect(program.ok).toBe(true);
    if (program.ok) expect(program.data.program_id).toBe(PROGRAM_ID);

    const course = await createInstructorCourse(supabase, {
      program_id: PROGRAM_ID,
      name: "UX Foundations",
    });
    expect(course.ok).toBe(true);
    if (course.ok) expect(course.data.course_id).toBe(COURSE_ID);
  });
});
