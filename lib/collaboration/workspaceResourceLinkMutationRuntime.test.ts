import { describe, expect, it, vi } from "vitest";
import {
  COLLABORATION_RESOURCE_LINK_MUTATION_RPCS,
  createCollaborationWorkspaceResourceLink,
  deleteCollaborationWorkspaceResourceLink,
  sanitizeCollaborationResourceLinkMutationError,
  updateCollaborationWorkspaceResourceLink,
} from "./workspaceResourceLinkMutationRuntime";

const WS = "11111111-1111-4111-8111-111111111111";
const RES = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER = "22222222-2222-4222-8222-222222222222";

function linkPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: LINK,
    workspace_id: WS,
    resource_type: "learning_space",
    resource_id: RES,
    relationship_type: "linked",
    status: "active",
    linked_by: USER,
    linked_at: "2026-01-02T00:00:00Z",
    metadata: { note: "ok" },
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function mockRpcClient(
  impl: (rpc: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>
) {
  return {
    rpc: vi.fn(impl),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("workspaceResourceLinkMutationRuntime", () => {
  it("exposes canonical mutation RPC names", () => {
    expect(COLLABORATION_RESOURCE_LINK_MUTATION_RPCS).toEqual({
      create: "create_collaboration_workspace_resource_link",
      update: "update_collaboration_workspace_resource_link",
      delete: "delete_collaboration_workspace_resource_link",
    });
  });

  it("creates a valid resource link via RPC", async () => {
    const supabase = mockRpcClient(async () => ({
      data: linkPayload(),
      error: null,
    }));
    const result = await createCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      resourceType: "learning_space",
      resourceId: RES,
      metadata: { note: "ok" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(LINK);
      expect(result.data.resourceType).toBe("learning_space");
    }
    expect(supabase.rpc).toHaveBeenCalledWith(
      COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.create,
      expect.objectContaining({
        p_workspace_id: WS,
        p_resource_type: "learning_space",
        p_resource_id: RES,
        p_relationship_type: "linked",
        p_metadata: { note: "ok" },
      })
    );
  });

  it("rejects invalid resource references before RPC", async () => {
    const supabase = mockRpcClient(async () => ({
      data: null,
      error: null,
    }));
    const result = await createCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      resourceType: "course" as "store",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: false,
      message: "Unsupported collaboration resource type.",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed metadata before RPC", async () => {
    const supabase = mockRpcClient(async () => ({
      data: null,
      error: null,
    }));
    const result = await createCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      resourceType: "store",
      resourceId: RES,
      metadata: { nested: { bad: true } } as never,
    });
    expect(result).toEqual({
      ok: false,
      message: "metadata values must be string, number, boolean, or null.",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps duplicate/conflict RPC errors deterministically", async () => {
    const supabase = mockRpcClient(async () => ({
      data: null,
      error: { message: "Resource is already linked to a workspace" },
    }));
    const result = await createCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      resourceType: "store",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: false,
      message: "That resource is already linked to a workspace.",
    });
  });

  it("fail-closes unauthorized backend denials", async () => {
    const supabase = mockRpcClient(async () => ({
      data: null,
      error: { message: "Not allowed to manage workspace resource links" },
    }));
    const result = await createCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      resourceType: "advertiser_account",
      resourceId: RES,
    });
    expect(result).toEqual({
      ok: false,
      message: "You are not allowed to manage workspace resource links.",
    });
  });

  it("updates whitelist fields only and rejects empty updates", async () => {
    const empty = await updateCollaborationWorkspaceResourceLink(
      mockRpcClient(async () => ({ data: null, error: null })),
      { workspaceId: WS, linkId: LINK }
    );
    expect(empty).toEqual({
      ok: false,
      message: "No supported resource link fields to update.",
    });

    const supabase = mockRpcClient(async () => ({
      data: linkPayload({ status: "revoked", relationship_type: "manages" }),
      error: null,
    }));
    const result = await updateCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      linkId: LINK,
      status: "revoked",
      relationshipType: "manages",
      metadata: { note: "rev" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("revoked");
      expect(result.data.relationshipType).toBe("manages");
    }
    expect(supabase.rpc).toHaveBeenCalledWith(
      COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.update,
      {
        p_workspace_id: WS,
        p_link_id: LINK,
        p_status: "revoked",
        p_relationship_type: "manages",
        p_metadata: { note: "rev" },
      }
    );
  });

  it("rejects unsupported update whitelist values without RPC", async () => {
    const supabase = mockRpcClient(async () => ({
      data: null,
      error: null,
    }));
    const result = await updateCollaborationWorkspaceResourceLink(supabase, {
      workspaceId: WS,
      linkId: LINK,
      status: "archived" as "active",
    });
    expect(result).toEqual({
      ok: false,
      message: "Unsupported collaboration resource status.",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("deletes a link and maps not-found fail-closed", async () => {
    const okClient = mockRpcClient(async () => ({
      data: { workspace_id: WS, link_id: LINK, deleted: true },
      error: null,
    }));
    const deleted = await deleteCollaborationWorkspaceResourceLink(okClient, {
      workspaceId: WS,
      linkId: LINK,
    });
    expect(deleted).toEqual({
      ok: true,
      data: { workspaceId: WS, linkId: LINK, deleted: true },
    });

    const missing = mockRpcClient(async () => ({
      data: null,
      error: { message: "Resource link not found" },
    }));
    const notFound = await deleteCollaborationWorkspaceResourceLink(missing, {
      workspaceId: WS,
      linkId: LINK,
    });
    expect(notFound).toEqual({
      ok: false,
      message: "Resource link was not found.",
    });
  });

  it("sanitizes long or auth-shaped RPC errors", () => {
    expect(
      sanitizeCollaborationResourceLinkMutationError("Authentication required")
    ).toBe("You are not allowed to manage workspace resource links.");
    expect(
      sanitizeCollaborationResourceLinkMutationError("a".repeat(200))
    ).toBe("Workspace resource link mutation failed.");
  });
});
