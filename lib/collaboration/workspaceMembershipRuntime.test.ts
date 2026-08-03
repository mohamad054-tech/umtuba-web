import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  COLLABORATION_WORKSPACE_RPCS,
  COLLABORATION_WORKSPACE_SPINE_RPCS,
  collaborationWorkspaceCanMutatePeer,
} from "./workspaceSpineFoundation";
import {
  COLLABORATION_MEMBERSHIP_RUNTIME_RPCS,
  acceptCollaborationWorkspaceInvite,
  archiveCollaborationWorkspace,
  createCollaborationWorkspace,
  declineCollaborationWorkspaceInvite,
  inviteCollaborationWorkspaceMember,
  leaveCollaborationWorkspace,
  removeCollaborationWorkspaceMember,
  revokeCollaborationWorkspaceInvite,
  sanitizeCollaborationMembershipError,
  suspendCollaborationWorkspaceMember,
  transferCollaborationWorkspaceOwnership,
} from "./workspaceMembershipRuntime";

const ROOT = process.cwd();
const SPINE_MIGRATION =
  "supabase/migrations/20260896_collaboration_workspace_spine_foundation_v1.sql";
const RUNTIME_MIGRATION =
  "supabase/migrations/20260897_collaboration_workspace_membership_runtime_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fnBody(sql: string, name: string): string {
  const re = new RegExp(
    `create or replace function public\\.${name}[\\s\\S]*?^\\$\\$;`,
    "im"
  );
  const m = sql.match(re);
  return m?.[0] ?? "";
}

function mockClient(handlers: Record<string, unknown>) {
  return {
    rpc: vi.fn(async (name: string, args?: Record<string, unknown>) => {
      const handler = handlers[name];
      if (typeof handler === "function") {
        return handler(args);
      }
      if (handler && typeof handler === "object") {
        return handler;
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const WS = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const INVITE = "33333333-3333-4333-8333-333333333333";

describe("Collaboration Membership Runtime V1 — files", () => {
  it("ships runtime module and additive migration", () => {
    expect(existsSync(join(ROOT, RUNTIME_MIGRATION))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/collaboration/workspaceMembershipRuntime.ts"))
    ).toBe(true);
    expect(existsSync(join(ROOT, SPINE_MIGRATION))).toBe(true);
  });
});

describe("Collaboration Membership Runtime — RPC catalog", () => {
  it("covers required flows including revoke and leave", () => {
    expect(COLLABORATION_MEMBERSHIP_RUNTIME_RPCS).toMatchObject({
      create: "create_collaboration_workspace",
      invite: "invite_collaboration_workspace_member",
      acceptInvite: "accept_collaboration_workspace_invite",
      declineInvite: "decline_collaboration_workspace_invite",
      revokeInvite: "revoke_collaboration_workspace_invite",
      suspendMember: "suspend_collaboration_workspace_member",
      removeMember: "remove_collaboration_workspace_member",
      transferOwnership: "transfer_collaboration_workspace_ownership",
      leaveWorkspace: "leave_collaboration_workspace",
      archive: "archive_collaboration_workspace",
      updateSettings: "update_collaboration_workspace_settings",
    });
    expect(COLLABORATION_WORKSPACE_RPCS.revokeInvite).toBe(
      COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.revokeInvite
    );
    expect(COLLABORATION_WORKSPACE_RPCS.updateSettings).toBe(
      COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.updateSettings
    );
    expect(Object.keys(COLLABORATION_WORKSPACE_SPINE_RPCS)).not.toContain(
      "revokeInvite"
    );
    expect(Object.keys(COLLABORATION_WORKSPACE_SPINE_RPCS)).not.toContain(
      "updateSettings"
    );
  });
});

describe("Collaboration Membership Runtime — SQL guards", () => {
  const runtimeSql = read(RUNTIME_MIGRATION);
  const spineSql = read(SPINE_MIGRATION);

  it("adds revoke + leave only; no commerce/learning binding", () => {
    expect(runtimeSql).toMatch(
      /create or replace function public\.revoke_collaboration_workspace_invite/i
    );
    expect(runtimeSql).toMatch(
      /create or replace function public\.leave_collaboration_workspace/i
    );
    expect(runtimeSql).not.toMatch(/alter table public\.learning_/i);
    expect(runtimeSql).not.toMatch(/alter table public\.stores\b/i);
    expect(runtimeSql).not.toMatch(/create table/i);
    expect(runtimeSql).not.toMatch(/link_collaboration_workspace_resource/i);
  });

  it("revoke invite: manage-or-inviter, one-time pending, expiry, audit", () => {
    const body = fnBody(runtimeSql, "revoke_collaboration_workspace_invite");
    expect(body).toMatch(/can_manage_collaboration_workspace/);
    expect(body).toMatch(/invited_by = v_uid/);
    expect(body).toMatch(/status is distinct from 'pending'/);
    expect(body).toMatch(/Invite has expired/);
    expect(body).toMatch(/status = 'revoked'/);
    expect(body).toMatch(/'invite\.revoke'/);
    expect(runtimeSql).toMatch(
      /grant execute on function public\.revoke_collaboration_workspace_invite\(uuid\)\s+to authenticated, service_role/i
    );
    expect(runtimeSql).toMatch(
      /grant execute on function public\.leave_collaboration_workspace\(uuid\)\s+to authenticated, service_role/i
    );
  });

  it("leave workspace: last-owner blocked, status left, audit", () => {
    const body = fnBody(runtimeSql, "leave_collaboration_workspace");
    expect(body).toMatch(/Transfer ownership before leaving the workspace/);
    expect(body).toMatch(/status = 'left'/);
    expect(body).toMatch(/'member\.leave'/);
    expect(body).toMatch(/Active membership not found/);
  });

  it("spine still enforces peer-admin, one-time token, duplicate invite", () => {
    expect(collaborationWorkspaceCanMutatePeer("admin", "admin")).toBe(false);
    const accept = fnBody(spineSql, "accept_collaboration_workspace_invite");
    expect(accept).toMatch(/Invite not found or already used/);
    expect(accept).toMatch(/Invite has expired/);
    expect(accept).toMatch(/status = 'accepted'/);

    const invite = fnBody(spineSql, "invite_collaboration_workspace_member");
    expect(invite).toMatch(/User is already an active member/);
    expect(invite).toMatch(/status = 'revoked'/);

    const remove = fnBody(spineSql, "remove_collaboration_workspace_member");
    expect(remove).toMatch(/Cannot remove the active owner/);
    expect(remove).toMatch(/Peer-admin protection/);

    expect(spineSql).toMatch(
      /collaboration_workspace_invites_pending_user_uidx/i
    );
    expect(spineSql).toMatch(
      /collaboration_workspace_members_one_active_owner_uidx/i
    );
    expect(spineSql).toMatch(
      /alter table public\.collaboration_workspace_members force row level security/i
    );
  });
});

describe("Collaboration Membership Runtime — client guards", () => {
  it("sanitizes ownership / invite / auth errors fail-closed", () => {
    expect(
      sanitizeCollaborationMembershipError(
        "Transfer ownership before leaving the workspace"
      )
    ).toMatch(/Ownership must be transferred/i);
    expect(
      sanitizeCollaborationMembershipError("Invite has expired")
    ).toMatch(/invalid, expired, or already used/i);
    expect(
      sanitizeCollaborationMembershipError("Peer-admin protection: cannot mutate")
    ).toMatch(/not allowed/i);
    expect(sanitizeCollaborationMembershipError("")).toMatch(/failed/i);
  });

  it("rejects invalid create / invite / uuid inputs without RPC", async () => {
    const supabase = mockClient({});

    expect(
      await createCollaborationWorkspace(supabase, {
        slug: "Bad Slug",
        displayName: "Acme",
        kind: "team",
      })
    ).toEqual({ ok: false, message: "Invalid workspace slug" });

    expect(
      await inviteCollaborationWorkspaceMember(supabase, {
        workspaceId: WS,
        role: "owner",
        invitedEmail: "a@b.co",
      })
    ).toEqual({ ok: false, message: "Invalid invite role" });

    expect(
      await inviteCollaborationWorkspaceMember(supabase, {
        workspaceId: WS,
        role: "member",
      })
    ).toEqual({
      ok: false,
      message: "invited_user_id or invited_email is required",
    });

    expect(await leaveCollaborationWorkspace(supabase, "not-a-uuid")).toEqual({
      ok: false,
      message: "workspace_id must be a valid UUID",
    });

    expect(await acceptCollaborationWorkspaceInvite(supabase, "  ")).toEqual({
      ok: false,
      message: "Invite token is required",
    });

    expect((supabase.rpc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      0
    );
  });

  it("create + activate happy path", async () => {
    const supabase = mockClient({
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.create]: {
        data: { workspace_id: WS },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.activate]: {
        data: { workspace_id: WS, status: "active" },
        error: null,
      },
    });

    const result = await createCollaborationWorkspace(supabase, {
      slug: "acme-team",
      displayName: "Acme Team",
      kind: "team",
    });
    expect(result).toEqual({
      ok: true,
      data: { workspace_id: WS, status: "active" },
    });
    expect((supabase.rpc as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
      2
    );
  });

  it("wires invite / accept / decline / revoke / leave / archive RPCs", async () => {
    const supabase = mockClient({
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.invite]: {
        data: { invite_id: INVITE, token: "tok", expires_at: "2099-01-01" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.acceptInvite]: {
        data: { workspace_id: WS, role: "member" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.declineInvite]: {
        data: { invite_id: INVITE, status: "declined" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.revokeInvite]: {
        data: { invite_id: INVITE, status: "revoked" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.leaveWorkspace]: {
        data: { workspace_id: WS, user_id: USER, status: "left" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.archive]: {
        data: { workspace_id: WS, status: "archived" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.suspendMember]: {
        data: { workspace_id: WS, user_id: USER, status: "suspended" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.removeMember]: {
        data: { workspace_id: WS, user_id: USER, status: "removed" },
        error: null,
      },
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.transferOwnership]: {
        data: { workspace_id: WS, owner_user_id: USER },
        error: null,
      },
    });

    expect(
      await inviteCollaborationWorkspaceMember(supabase, {
        workspaceId: WS,
        role: "member",
        invitedEmail: "user@example.com",
      })
    ).toMatchObject({ ok: true, data: { invite_id: INVITE, token: "tok" } });

    expect(await acceptCollaborationWorkspaceInvite(supabase, "plain-token")).toEqual({
      ok: true,
      data: { workspace_id: WS, role: "member" },
    });

    expect(await declineCollaborationWorkspaceInvite(supabase, "plain-token")).toEqual({
      ok: true,
      data: { invite_id: INVITE, status: "declined" },
    });

    expect(await revokeCollaborationWorkspaceInvite(supabase, INVITE)).toEqual({
      ok: true,
      data: { invite_id: INVITE, status: "revoked" },
    });

    expect(await leaveCollaborationWorkspace(supabase, WS)).toEqual({
      ok: true,
      data: { workspace_id: WS, user_id: USER, status: "left" },
    });

    expect(await archiveCollaborationWorkspace(supabase, WS)).toEqual({
      ok: true,
      data: { workspace_id: WS, status: "archived" },
    });

    expect(await suspendCollaborationWorkspaceMember(supabase, WS, USER)).toEqual({
      ok: true,
      data: { workspace_id: WS, user_id: USER, status: "suspended" },
    });

    expect(await removeCollaborationWorkspaceMember(supabase, WS, USER)).toEqual({
      ok: true,
      data: { workspace_id: WS, user_id: USER, status: "removed" },
    });

    expect(
      await transferCollaborationWorkspaceOwnership(supabase, WS, USER)
    ).toEqual({
      ok: true,
      data: { workspace_id: WS, owner_user_id: USER },
    });
  });

  it("maps last-owner leave RPC error through sanitizer", async () => {
    const supabase = mockClient({
      [COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.leaveWorkspace]: {
        data: null,
        error: {
          message: "Transfer ownership before leaving the workspace",
        },
      },
    });

    expect(await leaveCollaborationWorkspace(supabase, WS)).toEqual({
      ok: false,
      message: "Ownership must be transferred before this membership change.",
    });
  });
});
