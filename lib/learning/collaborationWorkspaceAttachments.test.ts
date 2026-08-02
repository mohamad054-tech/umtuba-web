import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COLLABORATION_WORKSPACE_ATTACHMENT_CARD_ORDER,
  COLLABORATION_WORKSPACE_ATTACHMENTS_ID,
  mapAssignmentsAttachmentCard,
  mapCommunityAttachmentCard,
  mapLiveAttachmentCard,
  mapTutorAttachmentCard,
} from "./collaborationWorkspaceAttachments";

const ROOT = join(__dirname, "../..");
const MODULE = "lib/learning/collaborationWorkspaceAttachments.ts";
const DOC =
  "docs/learning/implementation/COLLABORATION_WORKSPACE_ATTACHMENTS_FOUNDATION_V1.md";
const COURSE = "11111111-1111-4111-8111-111111111111";
const LESSON = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const ACTIVITY = "44444444-4444-4444-8444-444444444444";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Workspace Attachments Foundation V1 — files", () => {
  it("ships module, docs, and extended shell (no migration)", () => {
    expect(existsSync(join(ROOT, MODULE))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/components/learning/CollaborationWorkspaceShell.tsx")
      )
    ).toBe(true);
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) =>
        f.includes("collaboration_workspace_attachments")
      )
    ).toBe(false);
  });
});

describe("Collaboration Workspace Attachments — community", () => {
  it("maps latest activity + unanswered indicator", () => {
    const card = mapCommunityAttachmentCard(COURSE, {
      course_id: COURSE,
      unanswered_question_count: 2,
      items: [
        {
          kind: "discussion",
          id: "t1",
          title: "Week 1 intro",
        },
      ],
    });
    expect(card.availability).toBe("available");
    expect(card.summary).toContain("Week 1 intro");
    expect(card.unreadIndicator).toEqual({
      kind: "unanswered_questions",
      count: 2,
    });
    expect(card.ctaHref).toContain("/community");
  });

  it("maps empty feed with discussion CTA", () => {
    const card = mapCommunityAttachmentCard(COURSE, {
      course_id: COURSE,
      unanswered_question_count: 0,
      items: [],
    });
    expect(card.availability).toBe("empty");
    expect(card.ctaHref).toContain("/discussions");
  });

  it("maps unavailable when feed missing", () => {
    const card = mapCommunityAttachmentCard(COURSE, null);
    expect(card.availability).toBe("unavailable");
    expect(card.ctaHref).toBeNull();
  });
});

describe("Collaboration Workspace Attachments — assignments", () => {
  it("summarizes due dates and submission state", () => {
    const card = mapAssignmentsAttachmentCard(COURSE, [
      {
        activityId: ACTIVITY,
        name: "Essay",
        type: "assignment",
        dueAt: "2026-08-10T00:00:00.000Z",
        submissionStatus: "draft",
        publishedAt: "2026-08-01T00:00:00.000Z",
        submittedAt: null,
        reviewedAt: null,
      },
    ]);
    expect(card.availability).toBe("available");
    expect(card.summary).toContain("next due");
    expect(card.meta.nextDueAt).toBe("2026-08-10T00:00:00.000Z");
    expect(card.ctaHref).toContain("/assignment");
  });

  it("is empty when none", () => {
    const card = mapAssignmentsAttachmentCard(COURSE, []);
    expect(card.availability).toBe("empty");
  });

  it("is unavailable when overview failed", () => {
    const card = mapAssignmentsAttachmentCard(COURSE, null);
    expect(card.availability).toBe("unavailable");
  });
});

describe("Collaboration Workspace Attachments — tutor", () => {
  it("continues latest learner-owned thread", () => {
    const card = mapTutorAttachmentCard(COURSE, {
      threads: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          lesson_id: LESSON,
          title: "Explain loops",
          updated_at: "2026-08-01T12:00:00.000Z",
        },
      ],
    });
    expect(card.availability).toBe("available");
    expect(card.ctaLabel).toBe("Continue session");
    expect(card.ctaHref).toBe(`/learning/lessons/${LESSON}/ai-tutor`);
    expect(card.meta.sharedMemory).toBe(false);
  });

  it("empty when no threads", () => {
    const card = mapTutorAttachmentCard(COURSE, { threads: [] });
    expect(card.availability).toBe("empty");
  });
});

describe("Collaboration Workspace Attachments — live", () => {
  it("maps next session + join availability", () => {
    const card = mapLiveAttachmentCard(
      COURSE,
      {
        course_id: COURSE,
        sessions: [
          {
            session_id: SESSION,
            title: "Office hours",
            status: "live",
            starts_at: "2026-08-02T18:00:00.000Z",
          },
        ],
      },
      { session_id: SESSION, can_join: true }
    );
    expect(card.availability).toBe("available");
    expect(card.meta.joinAvailable).toBe(true);
    expect(card.ctaLabel).toBe("Join session");
    expect(card.ctaHref).toContain(`/live/${SESSION}`);
  });

  it("empty when no upcoming sessions", () => {
    const card = mapLiveAttachmentCard(
      COURSE,
      { course_id: COURSE, sessions: [] },
      null
    );
    expect(card.availability).toBe("empty");
  });
});

describe("Collaboration Workspace Attachments — boundaries", () => {
  it("keeps hub card order and no forbidden scope", () => {
    expect([...COLLABORATION_WORKSPACE_ATTACHMENT_CARD_ORDER]).toEqual([
      "community",
      "assignments_projects",
      "tutor",
      "live",
    ]);
    expect(COLLABORATION_WORKSPACE_ATTACHMENTS_ID).toContain("attachments");
    const src = read(MODULE);
    expect(src).not.toMatch(/lib\/store\//);
    expect(src).not.toMatch(/\b(stripe|payout|refund)\b/i);
    expect(src).not.toMatch(/LiveCollaborationPanel|mockCollaboration/);
    expect(src).not.toMatch(/WebSocket|createPresence|sharedMemory\s*=\s*true/i);
    expect(src).not.toMatch(/learning-assignment-files/);
    expect(src).toMatch(/sharedMemory: false/);
  });
});
