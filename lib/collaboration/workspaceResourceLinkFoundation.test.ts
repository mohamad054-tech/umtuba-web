import { describe, expect, it, vi } from "vitest";
import {
  collaborationResourceReferenceKey,
  getCollaborationWorkspaceResourceLinkByResource,
  listCollaborationWorkspaceResourceLinks,
  normalizeCollaborationWorkspaceResourceLinkRow,
  rejectCollaborationResourceLinkMutation,
  validateCollaborationResourceLinkCreateIntent,
  validateCollaborationResourceLinkRevokeIntent,
  validateCollaborationResourceReference,
} from "./workspaceResourceLinkFoundation";

const WS = "11111111-1111-4111-8111-111111111111";
const RES = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER = "22222222-2222-4222-8222-222222222222";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LINK,
    workspace_id: WS,
    resource_type: "learning_space",
    resource_id: RES,
    relationship_type: "linked",
    status: "active",
    linked_by: USER,
    linked_at: "2026-01-02T00:00:00Z",
    metadata: {},
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function mockFrom(handlers: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const handler = handlers[table];
      if (typeof handler === "function") return handler();
      return handler;
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("workspaceResourceLinkFoundation", () => {
  it("accepts a valid resource reference", () => {
    const result = validateCollaborationResourceReference({
      resourceType: "store",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: true,
      data: { resourceType: "store", resourceId: RES },
    });
  });

  it("rejects unsupported resource type", () => {
    const result = validateCollaborationResourceReference({
      resourceType: "live_session",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: false,
      message: "Unsupported collaboration resource type.",
    });
  });

  it("rejects invalid resource id", () => {
    const result = validateCollaborationResourceReference({
      resourceType: "learning_space",
      resourceId: "not-a-uuid",
    });
    expect(result).toEqual({
      ok: false,
      message: "resource_id must be a valid UUID.",
    });
  });

  it("rejects invalid workspace on create intent", () => {
    const result = validateCollaborationResourceLinkCreateIntent({
      workspaceId: "bad",
      resourceType: "store",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: false,
      message: "workspace_id must be a valid UUID.",
    });
  });

  it("normalizes create intent with default relationship", () => {
    const result = validateCollaborationResourceLinkCreateIntent({
      workspaceId: WS,
      resourceType: "advertiser_account",
      resourceId: RES,
      metadata: { note: "ref-only" },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        workspaceId: WS,
        resourceType: "advertiser_account",
        resourceId: RES,
        relationshipType: "linked",
        metadata: { note: "ref-only" },
      },
    });
  });

  it("validates revoke intent ids", () => {
    expect(
      validateCollaborationResourceLinkRevokeIntent({
        workspaceId: WS,
        linkId: "x",
      })
    ).toEqual({
      ok: false,
      message: "link_id must be a valid UUID.",
    });
    expect(
      validateCollaborationResourceLinkRevokeIntent({
        workspaceId: WS,
        linkId: LINK,
      })
    ).toEqual({
      ok: true,
      data: { workspaceId: WS, linkId: LINK },
    });
  });

  it("fail-closes mutation execution in V1", () => {
    expect(rejectCollaborationResourceLinkMutation()).toEqual({
      ok: false,
      message:
        "Collaboration resource link mutations are not available in foundation V1.",
    });
  });

  it("normalizes a DB row deterministically", () => {
    const result = normalizeCollaborationWorkspaceResourceLinkRow(baseRow());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      id: LINK,
      workspaceId: WS,
      resourceType: "learning_space",
      resourceId: RES,
      relationshipType: "linked",
      status: "active",
      linkedBy: USER,
      linkedAt: "2026-01-02T00:00:00Z",
      metadata: {},
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
    expect(collaborationResourceReferenceKey(result.data)).toBe(
      `learning_space:${RES}`
    );
  });

  it("rejects malformed rows (unsupported type)", () => {
    const result = normalizeCollaborationWorkspaceResourceLinkRow(
      baseRow({ resource_type: "course" })
    );
    expect(result).toEqual({
      ok: false,
      message: "Unsupported collaboration resource type.",
    });
  });

  it("lists links and fail-closes on auth errors", async () => {
    const okClient = mockFrom({
      collaboration_workspace_resource_links: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [baseRow()], error: null }),
          }),
        }),
      }),
    });
    const listed = await listCollaborationWorkspaceResourceLinks(okClient, WS);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data).toHaveLength(1);
      expect(listed.data[0]?.resourceType).toBe("learning_space");
    }

    const badId = await listCollaborationWorkspaceResourceLinks(
      okClient,
      "nope"
    );
    expect(badId).toEqual({
      ok: false,
      message: "workspace_id must be a valid UUID.",
    });
    expect(okClient.from).toHaveBeenCalledTimes(1);

    const denied = mockFrom({
      collaboration_workspace_resource_links: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: null,
              error: { message: "permission denied for table" },
            }),
          }),
        }),
      }),
    });
    const deniedResult = await listCollaborationWorkspaceResourceLinks(
      denied,
      WS
    );
    expect(deniedResult).toEqual({
      ok: false,
      message: "You are not allowed to view workspace resource links.",
    });
  });

  it("looks up by resource key and returns null when missing", async () => {
    const missing = mockFrom({
      collaboration_workspace_resource_links: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });
    const result = await getCollaborationWorkspaceResourceLinkByResource(
      missing,
      { resourceType: "store", resourceId: RES }
    );
    expect(result).toEqual({ ok: true, data: null });
  });
});
