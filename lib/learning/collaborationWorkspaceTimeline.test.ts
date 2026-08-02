import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COLLABORATION_WORKSPACE_TIMELINE_ID,
  buildCollaborationWorkspaceTimeline,
  mapAssignmentsTimelineItems,
  mapCommunityTimelineItems,
  mapLiveTimelineItems,
  mapTutorTimelineItems,
  sortCollaborationWorkspaceTimelineItems,
  type CollaborationWorkspaceTimelineItem,
} from "./collaborationWorkspaceTimeline";
import type { CollaborationWorkspaceHubSources } from "./collaborationWorkspaceAttachments";

const ROOT = join(__dirname, "../..");
const MODULE = "lib/learning/collaborationWorkspaceTimeline.ts";
const DOC =
  "docs/learning/implementation/COLLABORATION_WORKSPACE_ACTIVITY_TIMELINE_FOUNDATION_V1.md";
const COURSE = "11111111-1111-4111-8111-111111111111";
const THREAD = "22222222-2222-4222-8222-222222222222";
const ACTIVITY = "33333333-3333-4333-8333-333333333333";
const LESSON = "44444444-4444-4444-8444-444444444444";
const SESSION = "55555555-5555-4555-8555-555555555555";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Workspace Activity Timeline Foundation V1 — files", () => {
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
        f.includes("collaboration_workspace_activity_timeline")
      )
    ).toBe(false);
  });
});

describe("Collaboration Workspace Activity Timeline — community", () => {
  it("maps latest discussion, reply, and unanswered indicator", () => {
    const items = mapCommunityTimelineItems(
      COURSE,
      { unanswered_question_count: 3, items: [] },
      {
        threads: [
          {
            thread_id: THREAD,
            title: "Week 1",
            created_at: "2026-08-01T10:00:00.000Z",
            last_reply_at: "2026-08-02T12:00:00.000Z",
            reply_count: 2,
          },
        ],
      }
    );
    expect(items.map((i) => i.eventType)).toEqual(
      expect.arrayContaining([
        "unanswered_discussion",
        "latest_discussion",
        "latest_reply",
      ])
    );
    expect(items.find((i) => i.eventType === "unanswered_discussion")?.unread).toBe(
      true
    );
  });
});

describe("Collaboration Workspace Activity Timeline — assignments", () => {
  it("maps published, submission, due soon, graded", () => {
    const now = Date.parse("2026-08-02T12:00:00.000Z");
    const items = mapAssignmentsTimelineItems(
      COURSE,
      [
        {
          activityId: ACTIVITY,
          name: "Essay",
          type: "assignment",
          dueAt: "2026-08-03T12:00:00.000Z",
          submissionStatus: "not_started",
          publishedAt: "2026-08-01T00:00:00.000Z",
          submittedAt: null,
          reviewedAt: null,
        },
        {
          activityId: "66666666-6666-4666-8666-666666666666",
          name: "Lab",
          type: "assignment",
          dueAt: "2026-09-01T00:00:00.000Z",
          submissionStatus: "reviewed",
          publishedAt: "2026-07-01T00:00:00.000Z",
          submittedAt: "2026-07-15T00:00:00.000Z",
          reviewedAt: "2026-07-20T00:00:00.000Z",
        },
      ],
      now
    );
    expect(items.map((i) => i.eventType)).toEqual(
      expect.arrayContaining([
        "assignment_published",
        "due_soon",
        "submission_created",
        "graded",
      ])
    );
  });
});

describe("Collaboration Workspace Activity Timeline — tutor", () => {
  it("maps conversation, summary, continue session without shared memory", () => {
    const items = mapTutorTimelineItems(COURSE, {
      threads: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          lesson_id: LESSON,
          title: "Explain loops",
          summary: "Covered for-loops",
          updated_at: "2026-08-01T12:00:00.000Z",
        },
      ],
    });
    expect(items.map((i) => i.eventType)).toEqual([
      "latest_conversation",
      "latest_summary",
      "continue_session",
    ]);
    expect(items.every((i) => i.href?.includes("/ai-tutor"))).toBe(true);
  });
});

describe("Collaboration Workspace Activity Timeline — live", () => {
  it("maps scheduled/started/completed and recording only when present", () => {
    const items = mapLiveTimelineItems(COURSE, {
      sessions: [
        {
          session_id: SESSION,
          title: "Office hours",
          status: "live",
          starts_at: "2026-08-02T18:00:00.000Z",
          created_at: "2026-08-01T08:00:00.000Z",
        },
        {
          session_id: "77777777-7777-4777-8777-777777777777",
          title: "Past session",
          status: "completed",
          starts_at: "2026-07-01T18:00:00.000Z",
          completed_at: "2026-07-01T19:00:00.000Z",
          recording_status: "ready",
        },
      ],
    });
    expect(items.map((i) => i.eventType)).toEqual(
      expect.arrayContaining([
        "session_scheduled",
        "session_started",
        "session_completed",
        "recording_available",
      ])
    );
    const withoutRecording = mapLiveTimelineItems(COURSE, {
      sessions: [
        {
          session_id: SESSION,
          title: "Office hours",
          status: "scheduled",
          starts_at: "2026-08-10T18:00:00.000Z",
          created_at: "2026-08-01T08:00:00.000Z",
        },
      ],
    });
    expect(
      withoutRecording.some((i) => i.eventType === "recording_available")
    ).toBe(false);
  });
});

describe("Collaboration Workspace Activity Timeline — sort + build", () => {
  it("sorts newest first and builds from hub sources", () => {
    const unsorted: CollaborationWorkspaceTimelineItem[] = [
      {
        id: "a",
        source: "live",
        eventType: "session_scheduled",
        title: "A",
        summary: "A",
        timestamp: "2026-08-01T00:00:00.000Z",
        href: null,
        importance: "normal",
        unread: false,
        availability: "available",
      },
      {
        id: "b",
        source: "tutor",
        eventType: "continue_session",
        title: "B",
        summary: "B",
        timestamp: "2026-08-03T00:00:00.000Z",
        href: null,
        importance: "normal",
        unread: false,
        availability: "available",
      },
    ];
    expect(sortCollaborationWorkspaceTimelineItems(unsorted).map((i) => i.id)).toEqual([
      "b",
      "a",
    ]);

    const sources: CollaborationWorkspaceHubSources = {
      courseId: COURSE,
      communityFeed: { unanswered_question_count: 0, items: [] },
      discussionThreads: { threads: [] },
      assignmentItems: [],
      tutorThreads: { threads: [] },
      liveSessions: { sessions: [] },
      joinGate: null,
    };
    const view = buildCollaborationWorkspaceTimeline(sources);
    expect(view.capability).toBe(COLLABORATION_WORKSPACE_TIMELINE_ID);
    expect(view.availability).toBe("empty");
  });

  it("keeps boundaries: no realtime / commerce / shared memory", () => {
    const src = read(MODULE);
    expect(src).not.toMatch(/lib\/store\//);
    expect(src).not.toMatch(/\b(stripe|payout|refund)\b/i);
    expect(src).not.toMatch(/\bWebSocket\b/);
    expect(src).not.toMatch(/createPresence/);
    expect(src).not.toMatch(/sharedMemory\s*=\s*true/);
    expect(src).not.toMatch(/\bfirebase\b|\bonesignal\b/i);
    expect(src).toMatch(/loadCollaborationWorkspaceHubSources/);
  });
});
