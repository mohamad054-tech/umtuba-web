import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ASSESSMENT_AUTHORING_EXCLUDED_OPERATIONS,
  ASSESSMENT_AUTHORING_OPERATIONS,
  ASSESSMENT_AUTHORING_RPC_BY_OPERATION,
  buildAssessmentAuthoringRpcCall,
  sanitizeAssessmentRpcError,
  toStaffSafeQuestion,
} from "./assessmentAuthoring";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_LEARNER_FORBIDDEN } from "./learnerDelivery";

const ROOT = join(__dirname, "../..");
const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const QUESTION_ID = "66666666-6666-4666-8666-666666666666";
const QUESTION_ID_B = "77777777-7777-4777-8777-777777777777";

const SRC = readFileSync(
  join(ROOT, "lib/learning/assessmentAuthoring.ts"),
  "utf8"
);
const ACTIONS_SRC = readFileSync(
  join(ROOT, "app/learning/instructor/assessmentActions.ts"),
  "utf8"
);

describe("Assessment Authoring Minimal V1 — RPC map", () => {
  it("maps every allowlisted operation to an existing question foundation RPC", () => {
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.create_question).toBe(
      LEARNING_QUESTION_RPCS.create
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.update_question).toBe(
      LEARNING_QUESTION_RPCS.update
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.publish_question).toBe(
      LEARNING_QUESTION_RPCS.publish
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.unpublish_question).toBe(
      LEARNING_QUESTION_RPCS.unpublish
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.archive_question).toBe(
      LEARNING_QUESTION_RPCS.archive
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.reorder_questions).toBe(
      LEARNING_QUESTION_RPCS.reorder
    );
    expect(ASSESSMENT_AUTHORING_RPC_BY_OPERATION.set_answer_key).toBe(
      LEARNING_QUESTION_RPCS.setAnswerKey
    );
    expect(ASSESSMENT_AUTHORING_OPERATIONS).toHaveLength(7);
  });

  it("excludes moderate, activity settings, banks, and randomization", () => {
    expect(ASSESSMENT_AUTHORING_EXCLUDED_OPERATIONS).toContain(
      "moderate_question"
    );
    expect(ASSESSMENT_AUTHORING_EXCLUDED_OPERATIONS).toContain(
      "update_activity_settings"
    );
    for (const op of ASSESSMENT_AUTHORING_EXCLUDED_OPERATIONS) {
      expect(
        (ASSESSMENT_AUTHORING_OPERATIONS as readonly string[]).includes(op)
      ).toBe(false);
    }
  });
});

describe("Assessment Authoring Minimal V1 — validation", () => {
  it("rejects unknown operations (unauthenticated/unknown path fail-closed)", () => {
    const r = buildAssessmentAuthoringRpcCall("moderate_question", {
      question_id: QUESTION_ID,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed UUIDs", () => {
    const r = buildAssessmentAuthoringRpcCall("publish_question", {
      question_id: "not-a-uuid",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/UUID/i);
  });

  it("rejects unknown fields", () => {
    const r = buildAssessmentAuthoringRpcCall("create_question", {
      activity_id: ACTIVITY_ID,
      question_type: "true_false",
      content: { prompt: "Is this true?" },
      secret_flag: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Unknown field/);
  });

  it("rejects authoritative fields (status, created_by)", () => {
    const r = buildAssessmentAuthoringRpcCall("create_question", {
      activity_id: ACTIVITY_ID,
      question_type: "true_false",
      content: { prompt: "Is this true?" },
      status: "published",
      created_by: ACTIVITY_ID,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid / reserved / deferred question types", () => {
    for (const bad of ["essay", "long_answer", "matching", "ai_graded", "nope"]) {
      const r = buildAssessmentAuthoringRpcCall("create_question", {
        activity_id: ACTIVITY_ID,
        question_type: bad,
        content: { prompt: "x" },
      });
      expect(r.ok).toBe(false);
    }
  });

  it("builds create_question RPC args with p_ prefixes", () => {
    const r = buildAssessmentAuthoringRpcCall("create_question", {
      activity_id: ACTIVITY_ID,
      question_type: "multiple_choice_single",
      content: {
        prompt: "Pick one",
        options: [
          { key: "a", text: "One" },
          { key: "b", text: "Two" },
        ],
      },
      points: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("create_learning_question");
      expect(r.args).toEqual({
        p_activity_id: ACTIVITY_ID,
        p_question_type: "multiple_choice_single",
        p_content: {
          prompt: "Pick one",
          options: [
            { key: "a", text: "One" },
            { key: "b", text: "Two" },
          ],
        },
        p_points: 2,
      });
    }
  });

  it("rejects malformed reorder lists", () => {
    const empty = buildAssessmentAuthoringRpcCall("reorder_questions", {
      activity_id: ACTIVITY_ID,
      question_ids: [],
    });
    expect(empty.ok).toBe(false);

    const dup = buildAssessmentAuthoringRpcCall("reorder_questions", {
      activity_id: ACTIVITY_ID,
      question_ids: [QUESTION_ID, QUESTION_ID],
    });
    expect(dup.ok).toBe(false);

    const bad = buildAssessmentAuthoringRpcCall("reorder_questions", {
      activity_id: ACTIVITY_ID,
      question_ids: ["nope"],
    });
    expect(bad.ok).toBe(false);

    const ok = buildAssessmentAuthoringRpcCall("reorder_questions", {
      activity_id: ACTIVITY_ID,
      question_ids: [QUESTION_ID, QUESTION_ID_B],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.rpc).toBe("reorder_learning_questions");
      expect(ok.args.p_question_ids).toEqual([QUESTION_ID, QUESTION_ID_B]);
    }
  });

  it("maps set_answer_key without returning key payload args beyond p_answer_key", () => {
    const r = buildAssessmentAuthoringRpcCall("set_answer_key", {
      question_id: QUESTION_ID,
      question_type: "true_false",
      answer_key: { correct: true },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rpc).toBe("set_learning_question_answer_key");
      expect(r.args).toEqual({
        p_question_id: QUESTION_ID,
        p_answer_key: { correct: true },
      });
      expect(Object.keys(r.args)).not.toContain("p_question_type");
    }
  });

  it("rejects correctness fields embedded in content updates", () => {
    const r = buildAssessmentAuthoringRpcCall("update_question", {
      question_id: QUESTION_ID,
      content: { prompt: "x", correct_key: "a" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Correctness/);
  });

  it("sanitizes auth / lifecycle / SQL errors for safe UI messages", () => {
    expect(sanitizeAssessmentRpcError("Authentication required")).toMatch(
      /not allowed/i
    );
    expect(
      sanitizeAssessmentRpcError("Not allowed to create questions in this activity")
    ).toMatch(/not allowed/i);
    expect(
      sanitizeAssessmentRpcError(
        "Question is suspended; only platform moderation may change it"
      )
    ).toMatch(/suspended/i);
    expect(
      sanitizeAssessmentRpcError('relation "learning_questions" does not exist')
    ).toBe("Request could not be completed.");
    expect(
      sanitizeAssessmentRpcError(
        "reorder_learning_questions requires all question ids for the activity"
      )
    ).toMatch(/Reorder failed/);
  });
});

describe("Assessment Authoring Minimal V1 — answer-key firewall", () => {
  it("staff-safe question mapper never includes answer_key payload", () => {
    const safe = toStaffSafeQuestion(
      {
        id: QUESTION_ID,
        activity_id: ACTIVITY_ID,
        question_type: "true_false",
        status: "draft",
        position: 0,
        content: { prompt: "Q?", correct: true, answer_key: { x: 1 } },
        points: 1,
        created_at: "t",
        updated_at: "t",
        published_at: null,
        answer_key: { correct: true },
      },
      true
    );
    expect(safe.has_answer_key).toBe(true);
    expect(safe).not.toHaveProperty("answer_key");
    expect(safe.content).not.toHaveProperty("correct");
    expect(safe.content).not.toHaveProperty("answer_key");
    expect(Object.keys(safe)).not.toContain("answer_key");
    expect(JSON.stringify(safe.content)).not.toMatch(/correct|accepted|tolerance/);
  });

  it("loader selects question_id only from answer_keys table", () => {
    expect(SRC).toMatch(
      /\.from\("learning_question_answer_keys"\)[\s\S]*?\.select\("question_id"\)/
    );
    expect(SRC).not.toMatch(
      /\.from\("learning_question_answer_keys"\)[\s\S]*?\.select\([^)]*answer_key/
    );
  });

  it("learner-facing forbidden contract still blocks answer-key table", () => {
    expect(LEARNING_LEARNER_FORBIDDEN.questionTables).toContain(
      "learning_question_answer_keys"
    );
  });
});

describe("Assessment Authoring Minimal V1 — write path discipline", () => {
  it("module never performs direct INSERT/UPDATE/DELETE on Learning tables", () => {
    expect(SRC).not.toMatch(/\.insert\(/);
    expect(SRC).not.toMatch(/\.update\(/);
    expect(SRC).not.toMatch(/\.delete\(/);
    expect(SRC).not.toMatch(/\.upsert\(/);
    expect(ACTIONS_SRC).not.toMatch(/\.insert\(/);
    expect(ACTIONS_SRC).not.toMatch(/\.update\(/);
    expect(ACTIONS_SRC).not.toMatch(/\.delete\(/);
  });

  it("mutations go only through supabase.rpc", () => {
    expect(SRC).toMatch(/supabase\.rpc\(/);
    expect(ACTIONS_SRC).toMatch(/runAssessmentAuthoringOperation/);
    expect(ACTIONS_SRC).toMatch(/getServerUser/);
  });

  it("does not import or call scoring apply / progress / result-policy modules", () => {
    expect(SRC).not.toMatch(/progressMutations/);
    expect(SRC).not.toMatch(/learnerResultPolicy/);
    expect(SRC).not.toMatch(/learning_scoring_apply/);
    expect(ACTIONS_SRC).not.toMatch(/progressMutations/);
    expect(ACTIONS_SRC).not.toMatch(/learnerResultPolicy/);
  });
});
