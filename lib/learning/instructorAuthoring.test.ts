import { describe, expect, it } from "vitest";
import {
  INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS,
  INSTRUCTOR_AUTHORING_OPERATIONS,
  INSTRUCTOR_AUTHORING_RPC_BY_OPERATION,
  buildInstructorAuthoringRpcCall,
} from "./instructorAuthoring";
import { LEARNING_SECTION_RPCS } from "./sectionsFoundation";
import { LEARNING_LESSON_RPCS } from "./lessonsFoundation";
import { LEARNING_ACTIVITY_RPCS } from "./activitiesFoundation";
import { LEARNING_LESSON_CONTENT_BLOCK_RPCS } from "./lessonContentBlocksFoundation";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const SECTION_ID = "22222222-2222-4222-8222-222222222222";
const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const BLOCK_ID = "55555555-5555-4555-8555-555555555555";

describe("Instructor Authoring Minimal V1 — operation map", () => {
  it("maps every allowlisted operation to an existing foundation RPC", () => {
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.create_section).toBe(
      LEARNING_SECTION_RPCS.create
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.publish_section).toBe(
      LEARNING_SECTION_RPCS.publish
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.create_lesson).toBe(
      LEARNING_LESSON_RPCS.create
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.reorder_lessons).toBe(
      LEARNING_LESSON_RPCS.reorder
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.create_activity).toBe(
      LEARNING_ACTIVITY_RPCS.create
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.archive_activity).toBe(
      LEARNING_ACTIVITY_RPCS.archive
    );
    expect(INSTRUCTOR_AUTHORING_RPC_BY_OPERATION.unpublish_content_block).toBe(
      LEARNING_LESSON_CONTENT_BLOCK_RPCS.unpublish
    );
    expect(INSTRUCTOR_AUTHORING_OPERATIONS).toHaveLength(21);
  });

  it("excludes questions, answer keys, and moderation from Minimal V1", () => {
    expect(INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS).toContain("create_question");
    expect(INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS).toContain("set_answer_key");
    expect(INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS).toContain(
      "moderate_section"
    );
    for (const op of INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS) {
      expect(
        (INSTRUCTOR_AUTHORING_OPERATIONS as readonly string[]).includes(op)
      ).toBe(false);
    }
  });
});

describe("Instructor Authoring Minimal V1 — input validation", () => {
  it("rejects unknown operations", () => {
    const r = buildInstructorAuthoringRpcCall("create_question", {
      activity_id: ACTIVITY_ID,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed UUIDs", () => {
    const r = buildInstructorAuthoringRpcCall("publish_section", {
      section_id: "not-a-uuid",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/UUID/i);
  });

  it("rejects unknown input fields", () => {
    const r = buildInstructorAuthoringRpcCall("create_section", {
      course_id: COURSE_ID,
      slug: "intro-section",
      name: "Intro",
      secret_flag: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Unknown field/);
  });

  it("rejects authoritative fields (status, created_by, actor)", () => {
    const r = buildInstructorAuthoringRpcCall("create_section", {
      course_id: COURSE_ID,
      slug: "intro-section",
      name: "Intro",
      status: "published",
      created_by: COURSE_ID,
    });
    expect(r.ok).toBe(false);
  });

  it("builds create_section RPC args with p_ prefixes", () => {
    const r = buildInstructorAuthoringRpcCall("create_section", {
      course_id: COURSE_ID,
      slug: "Intro-Section",
      name: " Intro ",
      description: "Hello",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("create_learning_section");
      expect(r.args).toEqual({
        p_course_id: COURSE_ID,
        p_slug: "intro-section",
        p_name: "Intro",
        p_description: "Hello",
        p_visibility: "private",
        p_default_language: "en",
      });
    }
  });

  it("builds reorder payloads with complete unique UUID lists", () => {
    const r = buildInstructorAuthoringRpcCall("reorder_sections", {
      course_id: COURSE_ID,
      section_ids: [SECTION_ID, LESSON_ID],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("reorder_learning_sections");
      expect(r.args.p_section_ids).toEqual([SECTION_ID, LESSON_ID]);
    }

    const bad = buildInstructorAuthoringRpcCall("reorder_sections", {
      course_id: COURSE_ID,
      section_ids: [SECTION_ID, SECTION_ID],
    });
    expect(bad.ok).toBe(false);
  });

  it("maps content block unpublish only to the unpublish RPC", () => {
    const r = buildInstructorAuthoringRpcCall("unpublish_content_block", {
      block_id: BLOCK_ID,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("unpublish_learning_lesson_content_block");
      expect(r.args).toEqual({ p_block_id: BLOCK_ID });
    }
  });

  it("requires content object for update_content_block", () => {
    const r = buildInstructorAuthoringRpcCall("update_content_block", {
      block_id: BLOCK_ID,
    });
    expect(r.ok).toBe(false);
  });

  it("accepts create_activity with allowlisted type", () => {
    const r = buildInstructorAuthoringRpcCall("create_activity", {
      lesson_id: LESSON_ID,
      type: "quiz",
      slug: "quiz-one",
      name: "Quiz One",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("create_learning_activity");
      expect(r.args.p_type).toBe("quiz");
      expect(r.args.p_activity_id).toBeUndefined();
    }
  });

  it("does not expose position or parent reassignment on update", () => {
    const r = buildInstructorAuthoringRpcCall("update_lesson", {
      lesson_id: LESSON_ID,
      name: "Renamed",
      section_id: SECTION_ID,
      position: 99,
    });
    expect(r.ok).toBe(false);
  });
});
