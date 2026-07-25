import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS,
  INSTRUCTOR_AUTHORING_OPERATIONS,
  INSTRUCTOR_AUTHORING_RPC_BY_OPERATION,
  LEARNING_INSTRUCTOR_COURSE_TREE_RPC,
  LEARNING_INSTRUCTOR_LESSON_BLOCKS_RPC,
  buildInstructorAuthoringRpcCall,
  loadInstructorCourseTree,
  loadInstructorLessonBlocks,
  parseInstructorCourseTreePayload,
  parseInstructorLessonBlocksPayload,
} from "./instructorAuthoring";
import { LEARNING_SECTION_RPCS } from "./sectionsFoundation";
import { LEARNING_LESSON_RPCS } from "./lessonsFoundation";
import { LEARNING_ACTIVITY_RPCS } from "./activitiesFoundation";
import { LEARNING_LESSON_CONTENT_BLOCK_RPCS } from "./lessonContentBlocksFoundation";

const ROOT = join(__dirname, "../..");
const TREE_MIGRATION =
  "supabase/migrations/20260861_learning_instructor_course_tree_read_v1.sql";
const LESSON_BLOCKS_MIGRATION =
  "supabase/migrations/20260862_learning_instructor_lesson_blocks_read_v1.sql";
const AUTHORING_SRC = readFileSync(
  join(ROOT, "lib/learning/instructorAuthoring.ts"),
  "utf8"
);

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/g),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

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

describe("Instructor Course Tree Read RPC optimization V1", () => {
  const sql = read(TREE_MIGRATION);
  const fn = stripSqlComments(
    fnBody(sql, "get_instructor_learning_course_tree")
  );

  it("defines SECURITY DEFINER tree RPC with single auth gate", () => {
    expect(LEARNING_INSTRUCTOR_COURSE_TREE_RPC).toBe(
      "get_instructor_learning_course_tree"
    );
    expect(sql).toMatch(
      /create or replace function public\.get_instructor_learning_course_tree/
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/can_manage_learning_course\(p_course_id, v_uid\)/);
    expect(fn).toMatch(/is_learning_course_staff\(p_course_id, v_uid\)/);
    expect(fn).toMatch(/learning_sections/);
    expect(fn).toMatch(/learning_lessons/);
    expect(fn).toMatch(/learning_activities/);
    expect(fn).toMatch(/can_manage/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/insert into/i);
    expect(fn).not.toMatch(/update public\./i);
    expect(fn).not.toMatch(/delete from/i);
  });

  it("revokes anon/public and grants authenticated + service_role", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_instructor_learning_course_tree\(uuid\)\s+from public, anon/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_course_tree\(uuid\)\s+to authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_course_tree\(uuid\)\s+to service_role/i
    );
  });

  it("loadInstructorCourseTree uses the RPC and not chained table selects", () => {
    const loadBody = AUTHORING_SRC.slice(
      AUTHORING_SRC.indexOf("export async function loadInstructorCourseTree")
    );
    const nextExport = loadBody.indexOf("\nexport async function ", 1);
    const body =
      nextExport >= 0 ? loadBody.slice(0, nextExport) : loadBody;
    expect(body).toContain("LEARNING_INSTRUCTOR_COURSE_TREE_RPC");
    expect(body).toContain("p_course_id");
    expect(body).not.toMatch(/\.from\(\s*["']learning_courses["']/);
    expect(body).not.toMatch(/\.from\(\s*["']learning_sections["']/);
    expect(body).not.toMatch(/\.from\(\s*["']learning_lessons["']/);
    expect(body).not.toMatch(/\.from\(\s*["']learning_activities["']/);
  });

  it("parses nested tree payload and maps can_manage", () => {
    const parsed = parseInstructorCourseTreePayload({
      can_manage: true,
      tree: {
        course: {
          id: COURSE_ID,
          name: "Course",
          slug: "course",
          status: "draft",
          program_id: SECTION_ID,
          description: null,
        },
        sections: [
          {
            id: SECTION_ID,
            name: "Section",
            slug: "section",
            status: "draft",
            position: 0,
            description: null,
            lessons: [
              {
                id: LESSON_ID,
                name: "Lesson",
                slug: "lesson",
                status: "draft",
                position: 0,
                description: null,
                activities: [
                  {
                    id: ACTIVITY_ID,
                    name: "Quiz",
                    slug: "quiz",
                    status: "draft",
                    position: 0,
                    type: "quiz",
                    description: null,
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.canManage).toBe(true);
    expect(parsed?.tree.sections[0]?.lessons[0]?.activities[0]?.type).toBe(
      "quiz"
    );
  });

  it("loadInstructorCourseTree calls RPC once and returns tree", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push(name);
        expect(args).toEqual({ p_course_id: COURSE_ID });
        return {
          data: {
            can_manage: false,
            tree: {
              course: {
                id: COURSE_ID,
                name: "Course",
                slug: "course",
                status: "draft",
                program_id: SECTION_ID,
                description: null,
              },
              sections: [],
            },
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("table select must not be used for course tree");
      },
    };

    const loaded = await loadInstructorCourseTree(fake as never, COURSE_ID);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      const data = loaded.data as {
        tree: { course: { id: string }; sections: unknown[] };
        canManage: boolean;
      };
      expect(data.canManage).toBe(false);
      expect(data.tree.course.id).toBe(COURSE_ID);
      expect(data.tree.sections).toEqual([]);
    }
    expect(calls).toEqual(["get_instructor_learning_course_tree"]);

    const badId = await loadInstructorCourseTree(fake as never, "not-uuid");
    expect(badId.ok).toBe(false);
  });
});

describe("Instructor Lesson Blocks Read RPC optimization V1", () => {
  const sql = read(LESSON_BLOCKS_MIGRATION);
  const fn = stripSqlComments(
    fnBody(sql, "get_instructor_learning_lesson_blocks")
  );

  it("defines SECURITY DEFINER blocks RPC with single course auth gate", () => {
    expect(LEARNING_INSTRUCTOR_LESSON_BLOCKS_RPC).toBe(
      "get_instructor_learning_lesson_blocks"
    );
    expect(sql).toMatch(
      /create or replace function public\.get_instructor_learning_lesson_blocks/
    );
    expect(fn).toMatch(/security definer/i);
    expect(fn).toMatch(/learning_sections/);
    expect(fn).toMatch(/can_manage_learning_course\(v_course_id, v_uid\)/);
    expect(fn).toMatch(/is_learning_course_staff\(v_course_id, v_uid\)/);
    expect(fn).toMatch(/learning_lesson_content_blocks/);
    expect(fn).toMatch(/order by b\.position asc/);
    expect(fn).not.toMatch(/learning_question_answer_keys/);
    expect(fn).not.toMatch(/insert into/i);
    expect(fn).not.toMatch(/update public\./i);
    expect(fn).not.toMatch(/delete from/i);
  });

  it("revokes anon/public and grants authenticated + service_role", () => {
    expect(sql).toMatch(
      /revoke all on function public\.get_instructor_learning_lesson_blocks\(uuid\)\s+from public, anon/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_lesson_blocks\(uuid\)\s+to authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_instructor_learning_lesson_blocks\(uuid\)\s+to service_role/i
    );
  });

  it("loadInstructorLessonBlocks uses the RPC and not table selects", () => {
    const loadBody = AUTHORING_SRC.slice(
      AUTHORING_SRC.indexOf("export async function loadInstructorLessonBlocks")
    );
    expect(loadBody).toContain("LEARNING_INSTRUCTOR_LESSON_BLOCKS_RPC");
    expect(loadBody).toContain("p_lesson_id");
    expect(loadBody).not.toMatch(
      /\.from\(\s*["']learning_lesson_content_blocks["']/
    );
    expect(loadBody).not.toMatch(/\.from\(\s*["']learning_lessons["']/);
  });

  it("parses lesson + blocks payload", () => {
    const parsed = parseInstructorLessonBlocksPayload({
      can_manage: true,
      lesson: {
        id: LESSON_ID,
        name: "Lesson",
        slug: "lesson",
        status: "draft",
        section_id: SECTION_ID,
        course_id: COURSE_ID,
        description: null,
        position: 0,
      },
      blocks: [
        {
          id: BLOCK_ID,
          lesson_id: LESSON_ID,
          block_type: "rich_text",
          status: "draft",
          position: 0,
          content: { text: "Hello" },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.canManage).toBe(true);
    expect(parsed?.lesson.course_id).toBe(COURSE_ID);
    expect(parsed?.blocks[0]?.content).toEqual({ text: "Hello" });
  });

  it("loadInstructorLessonBlocks calls RPC once", async () => {
    const calls: string[] = [];
    const fake = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push(name);
        expect(args).toEqual({ p_lesson_id: LESSON_ID });
        return {
          data: {
            can_manage: true,
            lesson: {
              id: LESSON_ID,
              name: "Lesson",
              slug: "lesson",
              status: "draft",
              section_id: SECTION_ID,
              course_id: COURSE_ID,
              description: null,
              position: 0,
            },
            blocks: [],
          },
          error: null,
        };
      },
      from: () => {
        throw new Error("table select must not be used for lesson blocks");
      },
    };

    const loaded = await loadInstructorLessonBlocks(fake as never, LESSON_ID);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      const data = loaded.data as {
        lesson: { id: string };
        blocks: unknown[];
        canManage: boolean;
      };
      expect(data.lesson.id).toBe(LESSON_ID);
      expect(data.blocks).toEqual([]);
      expect(data.canManage).toBe(true);
    }
    expect(calls).toEqual(["get_instructor_learning_lesson_blocks"]);
  });
});
