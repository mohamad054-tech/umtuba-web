import { describe, expect, it, vi } from "vitest";
import {
  listCollaborationWorkspaceInvites,
  listCollaborationWorkspaceMembers,
  listMyCollaborationWorkspaces,
} from "./workspaceQueries";

function mockFrom(handlers: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const handler = handlers[table];
      if (typeof handler === "function") return handler();
      return handler;
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const USER = "22222222-2222-4222-8222-222222222222";
const WS = "11111111-1111-4111-8111-111111111111";

describe("workspaceQueries", () => {
  it("rejects invalid user id without querying", async () => {
    const supabase = mockFrom({});
    const result = await listMyCollaborationWorkspaces(supabase, "bad");
    expect(result).toEqual({
      ok: false,
      message: "user_id must be a valid UUID",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns empty list when user has no memberships", async () => {
    const supabase = mockFrom({
      collaboration_workspace_members: () => ({
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    });

    const result = await listMyCollaborationWorkspaces(supabase, USER);
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("maps membership + workspace + profile rows", async () => {
    const supabase = mockFrom({
      collaboration_workspace_members: () => ({
        select: () => ({
          eq: () => ({
            eq: async () => ({
              data: [{ workspace_id: WS, role: "owner", status: "active" }],
              error: null,
            }),
          }),
        }),
      }),
      collaboration_workspaces: () => ({
        select: () => ({
          in: () => ({
            order: async () => ({
              data: [
                {
                  id: WS,
                  slug: "acme-team",
                  status: "active",
                  owner_user_id: USER,
                  created_at: "2026-01-01",
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
      collaboration_workspace_profiles: () => ({
        select: () => ({
          in: async () => ({
            data: [
              {
                workspace_id: WS,
                kind: "team",
                display_name: "Acme",
                description: null,
                legal_name: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    const result = await listMyCollaborationWorkspaces(supabase, USER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: WS,
      slug: "acme-team",
      displayName: "Acme",
      myRole: "owner",
      kind: "team",
    });
  });

  it("lists members and pending invites via RLS selects", async () => {
    const supabase = mockFrom({
      collaboration_workspace_members: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              order: async () => ({
                data: [
                  {
                    user_id: USER,
                    role: "owner",
                    status: "active",
                    joined_at: "2026-01-01",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
      collaboration_workspace_invites: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  {
                    id: "33333333-3333-4333-8333-333333333333",
                    invited_user_id: null,
                    invited_email: "a@b.co",
                    role: "member",
                    status: "pending",
                    expires_at: "2099-01-01",
                    created_at: "2026-01-01",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const members = await listCollaborationWorkspaceMembers(supabase, WS);
    expect(members).toMatchObject({
      ok: true,
      data: [{ userId: USER, role: "owner", status: "active" }],
    });

    const invites = await listCollaborationWorkspaceInvites(supabase, WS);
    expect(invites.ok).toBe(true);
    if (!invites.ok) return;
    expect(invites.data[0]?.invitedEmail).toBe("a@b.co");
  });
});
