import { describe, expect, it, vi } from "vitest";
import {
  LEARNING_WORKSPACE_RESOURCE_PLATFORM,
  LEARNING_WORKSPACE_RESOURCE_TYPE,
  assertCanManageLearningSpaceForBinding,
  buildLearningSpaceLinkMetadata,
  createLearningWorkspaceResourceReference,
  createLearningWorkspaceResourceReferenceModel,
  learningSpaceResourceHref,
  listEligibleLearningSpacesForBinding,
  listLinkedLearningWorkspaceResources,
  resolveLearningWorkspaceResourceFromLink,
  resolveLearningWorkspaceResourceReference,
  unlinkLearningWorkspaceResourceReference,
} from "./learningWorkspaceResourceBinding";
import { COLLABORATION_RESOURCE_LINK_MUTATION_RPCS } from "./workspaceResourceLinkMutationRuntime";

const WS = "11111111-1111-4111-8111-111111111111";
const SPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER_WS = "33333333-3333-4333-8333-333333333333";

function spaceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SPACE,
    name: "UM Academy",
    slug: "um-academy",
    status: "active",
    mode: "creator_academy",
    ...overrides,
  };
}

function linkRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: LINK,
    workspaceId: WS,
    resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
    resourceId: SPACE,
    relationshipType: "linked" as const,
    status: "active" as const,
    linkedBy: null,
    linkedAt: "2026-01-02T00:00:00Z",
    metadata: {
      platform: LEARNING_WORKSPACE_RESOURCE_PLATFORM,
      product: LEARNING_WORKSPACE_RESOURCE_TYPE,
      display_name: "UM Academy",
      slug: "um-academy",
      status: "active",
      mode: "creator_academy",
      href: learningSpaceResourceHref(SPACE),
    },
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("learningWorkspaceResourceBinding", () => {
  it("maps a valid Learning space id to collaboration learning_space reference", () => {
    const result = createLearningWorkspaceResourceReferenceModel({
      spaceId: SPACE,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        resourceType: "learning_space",
        resourceId: SPACE,
      },
    });
    expect(LEARNING_WORKSPACE_RESOURCE_TYPE).toBe("learning_space");
  });

  it("rejects invalid/unsupported Learning identities", () => {
    expect(
      createLearningWorkspaceResourceReferenceModel({ spaceId: "not-a-uuid" })
    ).toEqual({
      ok: false,
      message: "Learning space id must be a valid UUID.",
    });
  });

  it("builds lightweight reference metadata and rejects malformed labels", () => {
    expect(
      buildLearningSpaceLinkMetadata({
        name: "UM Academy",
        slug: "um-academy",
        status: "active",
        mode: "creator_academy",
        href: learningSpaceResourceHref(SPACE),
      }).ok
    ).toBe(true);

    expect(
      buildLearningSpaceLinkMetadata({
        name: "",
        slug: "um-academy",
        status: "active",
        mode: "creator_academy",
        href: learningSpaceResourceHref(SPACE),
      })
    ).toEqual({
      ok: false,
      message: "Learning space display label is invalid.",
    });
  });

  it("fail-closes Learning authorization denial", async () => {
    const supabase = {
      rpc: vi.fn(async () => ({ data: false, error: null })),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const denied = await assertCanManageLearningSpaceForBinding(
      supabase,
      SPACE
    );
    expect(denied).toEqual({
      ok: false,
      message: "You are not allowed to bind this Learning space.",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("can_manage_learning_space", {
      p_space_id: SPACE,
    });
  });

  it("resolves Learning space into href + display label", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: spaceRow(), error: null }),
          }),
        }),
      })),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await resolveLearningWorkspaceResourceReference(supabase, {
      spaceId: SPACE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        resourceType: "learning_space",
        resourceId: SPACE,
        platform: "learning",
        displayLabel: "UM Academy",
        slug: "um-academy",
        status: "active",
        mode: "creator_academy",
        href: `/learning/instructor/spaces/${SPACE}/programs/new`,
      });
    }
  });

  it("creates a Learning binding via existing mutation runtime after Learning auth", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_manage_learning_space") {
        return { data: true, error: null };
      }
      if (name === COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.create) {
        return {
          data: {
            id: LINK,
            workspace_id: WS,
            resource_type: "learning_space",
            resource_id: SPACE,
            relationship_type: "linked",
            status: "active",
            linked_by: null,
            linked_at: "2026-01-02T00:00:00Z",
            metadata: {
              platform: "learning",
              product: "learning_space",
              display_name: "UM Academy",
              slug: "um-academy",
              status: "active",
              mode: "creator_academy",
              href: learningSpaceResourceHref(SPACE),
            },
            created_at: "2026-01-02T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    });

    const supabase = {
      rpc,
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: spaceRow(), error: null }),
          }),
        }),
      })),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await createLearningWorkspaceResourceReference(supabase, {
      workspaceId: WS,
      spaceId: SPACE,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.resourceType).toBe("learning_space");
      expect(result.data.resourceId).toBe(SPACE);
    }
    expect(rpc).toHaveBeenCalledWith(
      COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.create,
      expect.objectContaining({
        p_workspace_id: WS,
        p_resource_type: "learning_space",
        p_resource_id: SPACE,
      })
    );
  });

  it("does not call mutation RPC when Learning auth denies", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_manage_learning_space") {
        return { data: false, error: null };
      }
      return { data: null, error: null };
    });
    const supabase = {
      rpc,
      from: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await createLearningWorkspaceResourceReference(supabase, {
      workspaceId: WS,
      spaceId: SPACE,
    });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalledWith(
      COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.create,
      expect.anything()
    );
  });

  it("unlinks via existing mutation delete path", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "can_manage_learning_space") {
        return { data: true, error: null };
      }
      if (name === COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.delete) {
        return {
          data: { workspace_id: WS, link_id: LINK, deleted: true },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const supabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table !== "collaboration_workspace_resource_links") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: LINK,
                    workspace_id: WS,
                    resource_type: "learning_space",
                    resource_id: SPACE,
                    relationship_type: "linked",
                    status: "active",
                    linked_by: null,
                    linked_at: "2026-01-02T00:00:00Z",
                    metadata: {},
                    created_at: "2026-01-02T00:00:00Z",
                    updated_at: "2026-01-02T00:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await unlinkLearningWorkspaceResourceReference(supabase, {
      workspaceId: WS,
      spaceId: SPACE,
    });
    expect(result).toEqual({
      ok: true,
      data: { workspaceId: WS, linkId: LINK, deleted: true },
    });
    expect(rpc).toHaveBeenCalledWith(
      COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.delete,
      { p_workspace_id: WS, p_link_id: LINK }
    );
  });

  it("rejects unlink when link belongs to another workspace", async () => {
    const supabase = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: LINK,
                  workspace_id: OTHER_WS,
                  resource_type: "learning_space",
                  resource_id: SPACE,
                  relationship_type: "linked",
                  status: "active",
                  linked_by: null,
                  linked_at: "2026-01-02T00:00:00Z",
                  metadata: {},
                  created_at: "2026-01-02T00:00:00Z",
                  updated_at: "2026-01-02T00:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      })),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await unlinkLearningWorkspaceResourceReference(supabase, {
      workspaceId: WS,
      spaceId: SPACE,
    });
    expect(result).toEqual({
      ok: false,
      message: "Resource link does not belong to this workspace.",
    });
  });

  it("resolves presentation from an existing link without Commerce/advertiser types", () => {
    const resolved = resolveLearningWorkspaceResourceFromLink(linkRecord());
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.data.platform).toBe("learning");
      expect(resolved.data.resourceType).toBe("learning_space");
      expect(resolved.data.href).toContain("/learning/instructor/spaces/");
    }

    expect(
      resolveLearningWorkspaceResourceFromLink(
        linkRecord({ resourceType: "store" }) as never
      )
    ).toEqual({
      ok: false,
      message: "Unsupported collaboration resource type.",
    });
  });

  it("lists only Learning links for a workspace and skips other types", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    id: LINK,
                    workspace_id: WS,
                    resource_type: "learning_space",
                    resource_id: SPACE,
                    relationship_type: "linked",
                    status: "active",
                    linked_by: null,
                    linked_at: "2026-01-02T00:00:00Z",
                    metadata: {
                      platform: "learning",
                      product: "learning_space",
                      display_name: "UM Academy",
                      slug: "um-academy",
                      status: "active",
                      mode: "creator_academy",
                      href: learningSpaceResourceHref(SPACE),
                    },
                    created_at: "2026-01-02T00:00:00Z",
                    updated_at: "2026-01-02T00:00:00Z",
                  },
                  {
                    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                    workspace_id: WS,
                    resource_type: "store",
                    resource_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                    relationship_type: "linked",
                    status: "active",
                    linked_by: null,
                    linked_at: "2026-01-03T00:00:00Z",
                    metadata: {},
                    created_at: "2026-01-03T00:00:00Z",
                    updated_at: "2026-01-03T00:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
            order: async () => ({ data: [], error: null }),
          }),
        }),
      })),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await listLinkedLearningWorkspaceResources(supabase, WS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.resource.resourceId).toBe(SPACE);
      expect(result.data[0]?.resource.displayLabel).toBe("UM Academy");
    }
  });

  it("lists eligible Learning spaces excluding ones already linked here", async () => {
    const SPACE_B = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "learning_space_members") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: async () => ({
                    data: [
                      { space_id: SPACE, role: "owner" },
                      { space_id: SPACE_B, role: "admin" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "learning_spaces") {
          return {
            select: () => ({
              in: () => ({
                order: async () => ({
                  data: [
                    spaceRow(),
                    {
                      id: SPACE_B,
                      name: "Second Academy",
                      slug: "second-academy",
                      status: "active",
                      mode: "bootcamp",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "collaboration_workspace_resource_links") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: LINK,
                        workspace_id: WS,
                        resource_type: "learning_space",
                        resource_id: SPACE,
                        relationship_type: "linked",
                        status: "active",
                        linked_by: null,
                        linked_at: "2026-01-02T00:00:00Z",
                        metadata: {
                          display_name: "UM Academy",
                          slug: "um-academy",
                          status: "active",
                          mode: "creator_academy",
                          href: learningSpaceResourceHref(SPACE),
                        },
                        created_at: "2026-01-02T00:00:00Z",
                        updated_at: "2026-01-02T00:00:00Z",
                      },
                    ],
                    error: null,
                  }),
                }),
                order: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await listEligibleLearningSpacesForBinding(supabase, {
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: WS,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((s) => s.resourceId)).toEqual([SPACE_B]);
      expect(result.data[0]?.displayLabel).toBe("Second Academy");
    }
  });

  it("fail-closes eligible listing on invalid workspace id", async () => {
    const supabase = {
      from: vi.fn(),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await listEligibleLearningSpacesForBinding(supabase, {
      userId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "bad",
    });
    expect(result).toEqual({
      ok: false,
      message: "workspace_id must be a valid UUID.",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
