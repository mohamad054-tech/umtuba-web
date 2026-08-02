import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COLLABORATION_WORKSPACE_ATTACHMENT_IDS,
  COLLABORATION_WORKSPACE_IDENTITY_PREFIX,
  COLLABORATION_WORKSPACE_SPINE_ID,
  LEARNING_COLLABORATION_WORKSPACE_ROUTES,
  buildCollaborationWorkspaceAttachmentSlots,
  deriveCollaborationWorkspaceIdentity,
  loadCollaborationWorkspaceSpine,
} from "./collaborationWorkspaceSpine";

const ROOT = join(__dirname, "../..");
const DOC =
  "docs/learning/implementation/COLLABORATION_WORKSPACE_SPINE_FOUNDATION_V1.md";
const MODULE = "lib/learning/collaborationWorkspaceSpine.ts";
const PAGE = "app/learning/courses/[courseId]/workspace/page.tsx";
const SHELL = "app/components/learning/CollaborationWorkspaceShell.tsx";

const COURSE_A = "11111111-1111-4111-8111-111111111111";
const COURSE_B = "22222222-2222-4222-8222-222222222222";
const SPACE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPACE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LEARNER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Workspace Spine Foundation V1 — files", () => {
  it("ships docs, module, route, and shell (no migration)", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, MODULE))).toBe(true);
    expect(existsSync(join(ROOT, PAGE))).toBe(true);
    expect(existsSync(join(ROOT, SHELL))).toBe(true);
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("collaboration_workspace_spine"))
    ).toBe(false);
  });
});

describe("Collaboration Workspace Spine Foundation V1 — identity", () => {
  it("derives a stable workspace key from course + parent space", () => {
    const a = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_A,
      spaceId: SPACE_A,
    });
    const b = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_A,
      spaceId: SPACE_A,
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.data.workspaceKey).toBe(b.data.workspaceKey);
    expect(a.data.workspaceKey).toBe(
      `${COLLABORATION_WORKSPACE_IDENTITY_PREFIX}:${SPACE_A}:${COURSE_A}`
    );
    expect(a.data.capability).toBe(COLLABORATION_WORKSPACE_SPINE_ID);
  });

  it("changes identity when course or parent space changes", () => {
    const base = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_A,
      spaceId: SPACE_A,
    });
    const otherCourse = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_B,
      spaceId: SPACE_A,
    });
    const otherSpace = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_A,
      spaceId: SPACE_B,
    });
    expect(base.ok && otherCourse.ok && otherSpace.ok).toBe(true);
    if (!base.ok || !otherCourse.ok || !otherSpace.ok) return;
    expect(base.data.workspaceKey).not.toBe(otherCourse.data.workspaceKey);
    expect(base.data.workspaceKey).not.toBe(otherSpace.data.workspaceKey);
  });

  it("fails closed for invalid course id", () => {
    const r = deriveCollaborationWorkspaceIdentity({
      courseId: "not-a-uuid",
      spaceId: SPACE_A,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid_course_id");
  });

  it("fails closed for missing/invalid parent space id", () => {
    const r = deriveCollaborationWorkspaceIdentity({
      courseId: COURSE_A,
      spaceId: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("space_unavailable");
  });
});

describe("Collaboration Workspace Spine Foundation V1 — attachments", () => {
  it("exposes exactly four explicit empty/unavailable slots", () => {
    const slots = buildCollaborationWorkspaceAttachmentSlots({
      courseId: COURSE_A,
    });
    expect(slots.map((s) => s.id)).toEqual([
      ...COLLABORATION_WORKSPACE_ATTACHMENT_IDS,
    ]);
    for (const slot of slots) {
      expect(["empty", "unavailable"]).toContain(slot.state);
      expect(slot.reason).toBe("spine_foundation_v1_no_attachment_payload");
    }
    expect(slots.find((s) => s.id === "tutor")?.relatedHref).toBeNull();
    expect(slots.find((s) => s.id === "community")?.relatedHref).toContain(
      "/community"
    );
  });
});

describe("Collaboration Workspace Spine Foundation V1 — load fail-closed", () => {
  function mockClient(opts: {
    authUid?: string | null;
    course?: Record<string, unknown> | null;
    program?: Record<string, unknown> | null;
    space?: Record<string, unknown> | null;
  }) {
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = vi.fn(self);
      chain.eq = vi.fn(self);
      chain.maybeSingle = vi.fn(async () => {
        if (table === "learning_courses") {
          return { data: opts.course ?? null, error: null };
        }
        if (table === "learning_programs") {
          return { data: opts.program ?? null, error: null };
        }
        if (table === "learning_spaces") {
          return { data: opts.space ?? null, error: null };
        }
        return { data: null, error: null };
      });
      return chain;
    });
    return {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: opts.authUid ? { id: opts.authUid } : null },
          error: null,
        })),
      },
      from,
      rpc: vi.fn(async () => ({ data: true, error: null })),
    };
  }

  it("fails closed when learner is unauthorized", async () => {
    const supabase = mockClient({ authUid: null });
    const r = await loadCollaborationWorkspaceSpine(supabase as never, {
      courseId: COURSE_A,
      learnerUserId: LEARNER,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("unauthorized");
  });

  it("fails closed when course is missing/inaccessible", async () => {
    const supabase = mockClient({ authUid: LEARNER, course: null });
    const r = await loadCollaborationWorkspaceSpine(supabase as never, {
      courseId: COURSE_A,
      learnerUserId: LEARNER,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("course_unavailable");
  });

  it("fails closed when parent space is missing", async () => {
    const supabase = mockClient({
      authUid: LEARNER,
      course: {
        id: COURSE_A,
        name: "Course",
        slug: "course",
        program_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        status: "published",
      },
      program: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        space_id: null,
        status: "published",
      },
    });
    const r = await loadCollaborationWorkspaceSpine(supabase as never, {
      courseId: COURSE_A,
      learnerUserId: LEARNER,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("space_unavailable");
  });

  it("resolves spine when course + program + space are accessible", async () => {
    const programId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const supabase = mockClient({
      authUid: LEARNER,
      course: {
        id: COURSE_A,
        name: "Course A",
        slug: "course-a",
        program_id: programId,
        status: "published",
      },
      program: { id: programId, space_id: SPACE_A, status: "published" },
      space: {
        id: SPACE_A,
        name: "Space A",
        slug: "space-a",
        status: "active",
      },
    });
    const r = await loadCollaborationWorkspaceSpine(supabase as never, {
      courseId: COURSE_A,
      learnerUserId: LEARNER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.identity.workspaceKey).toContain(COURSE_A);
    expect(r.data.access.courseEntitled).toBe(true);
    expect(r.data.access.membershipModel).toBe("spaces_foundation_v1");
    expect(r.data.access.authorizationModel).toBe("course_entitlement_rls");
    expect(r.data.attachments).toHaveLength(4);
  });
});

describe("Collaboration Workspace Spine Foundation V1 — boundaries", () => {
  it("does not introduce a duplicate membership model or Commerce coupling", () => {
    const src = read(MODULE);
    expect(src).toMatch(/membershipModel: \"spaces_foundation_v1\"/);
    expect(src).toMatch(/authorizationModel: \"course_entitlement_rls\"/);
    expect(src).not.toMatch(/create table/i);
    expect(src).not.toMatch(/workspace_members/);
    expect(src).not.toMatch(/from [\"'].*lib\/store/);
    expect(src).not.toMatch(/lib\/store\//);
    expect(src).not.toMatch(/\b(stripe|payout|refund)\b/i);
    expect(src).not.toMatch(/LiveCollaborationPanel|mockCollaboration/);
    expect(src).not.toMatch(/WebSocket|createPresence|sharedMemory/i);
    expect(src).not.toMatch(/learning-assignment-files/);
  });

  it("exposes the workspace route helper", () => {
    expect(LEARNING_COLLABORATION_WORKSPACE_ROUTES.workspace(COURSE_A)).toBe(
      `/learning/courses/${COURSE_A}/workspace`
    );
  });
});
