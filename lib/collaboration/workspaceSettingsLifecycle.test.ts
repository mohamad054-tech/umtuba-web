import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { COLLABORATION_PLATFORM_ENABLED } from "./workspaceSpineFoundation";
import {
  COLLABORATION_WORKSPACE_RPCS,
} from "./workspaceSpineFoundation";
import {
  COLLABORATION_MEMBERSHIP_RUNTIME_RPCS,
  sanitizeCollaborationMembershipError,
  updateCollaborationWorkspaceSettings,
} from "./workspaceMembershipRuntime";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canArchiveCollaborationWorkspace,
  canLeaveCollaborationWorkspace,
  canManageCollaborationMembers,
  canManageCollaborationWorkspaceSettings,
  canMutateCollaborationMember,
  canTransferCollaborationOwnership,
} from "./workspaceUi";

const ROOT = process.cwd();
const SETTINGS_MIGRATION =
  "supabase/migrations/20260917_collaboration_workspace_settings_lifecycle_ui_v1.sql";

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

describe("Collaboration Settings & Lifecycle UI V1 — routes and flag", () => {
  it("keeps platform default off and exposes settings route", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect(COLLABORATION_UI_ROUTES.settings(WS)).toBe(
      `/workspaces/${WS}/settings`
    );
    expect(COLLABORATION_UI_COPY.settingsTitle).toMatch(/إعدادات/);
    expect(existsSync(join(ROOT, "app/workspaces/[workspaceId]/settings/page.tsx"))).toBe(
      true
    );
  });

  it("ships settings/lifecycle UI pieces and gated actions", () => {
    const files = [
      "app/components/collaboration/WorkspaceSettingsForm.tsx",
      "app/components/collaboration/WorkspaceLifecyclePanel.tsx",
      "app/actions/collaboration.ts",
      SETTINGS_MIGRATION,
    ];
    for (const rel of files) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }

    const actions = read("app/actions/collaboration.ts");
    expect(actions).toMatch(/updateCollaborationWorkspaceSettings/);
    expect(actions).toMatch(/leaveCollaborationWorkspace/);
    expect(actions).toMatch(/archiveCollaborationWorkspace/);
    expect(actions).toMatch(/transferCollaborationWorkspaceOwnership/);
    expect(actions).toMatch(/suspendCollaborationWorkspaceMember/);
    expect(actions).toMatch(/removeCollaborationWorkspaceMember/);
    expect(actions).toMatch(/rejectIfCollaborationPlatformDisabled/);
    expect(actions).not.toMatch(/learning_/);
    expect(actions).not.toMatch(/from\("stores"\)/);

    const layout = read("app/workspaces/layout.tsx");
    expect(layout).toMatch(/requireCollaborationPlatformPage/);
  });
});

describe("Collaboration Settings & Lifecycle — permissions helpers", () => {
  it("restricts privileged controls by role", () => {
    expect(canManageCollaborationWorkspaceSettings("owner")).toBe(true);
    expect(canManageCollaborationWorkspaceSettings("admin")).toBe(true);
    expect(canManageCollaborationWorkspaceSettings("member")).toBe(false);
    expect(canManageCollaborationMembers("admin")).toBe(true);
    expect(canManageCollaborationMembers("manager")).toBe(false);
    expect(canTransferCollaborationOwnership("owner")).toBe(true);
    expect(canTransferCollaborationOwnership("admin")).toBe(false);
    expect(canArchiveCollaborationWorkspace("owner")).toBe(true);
    expect(canArchiveCollaborationWorkspace("admin")).toBe(false);
    expect(canLeaveCollaborationWorkspace("member")).toBe(true);
    expect(canLeaveCollaborationWorkspace("owner")).toBe(false);
  });

  it("blocks owner/self/peer-rank member mutations in UI helpers", () => {
    const actor = "admin";
    const self = "22222222-2222-4222-8222-222222222222";
    const peer = "33333333-3333-4333-8333-333333333333";
    expect(
      canMutateCollaborationMember(actor, "owner", peer, self)
    ).toBe(false);
    expect(
      canMutateCollaborationMember(actor, "member", self, self)
    ).toBe(false);
    expect(
      canMutateCollaborationMember(actor, "admin", peer, self)
    ).toBe(false);
    expect(
      canMutateCollaborationMember(actor, "member", peer, self)
    ).toBe(true);
    expect(
      canMutateCollaborationMember("member", "auditor", peer, self)
    ).toBe(false);
  });
});

describe("Collaboration Settings update RPC migration", () => {
  const sql = read(SETTINGS_MIGRATION);

  it("adds settings update only; no table grants or domain binding", () => {
    expect(sql).toMatch(
      /create or replace function public\.update_collaboration_workspace_settings/i
    );
    expect(sql).not.toMatch(/create table/i);
    expect(sql).not.toMatch(/grant (insert|update|delete) on table/i);
    expect(sql).not.toMatch(/alter table public\.learning_/i);
    expect(sql).not.toMatch(/alter table public\.stores\b/i);
    expect(sql).not.toMatch(/alter table public\.ueos/i);
    expect(sql).not.toMatch(/from public\.learning_/i);
    expect(sql).not.toMatch(/from public\.stores\b/i);
    expect(COLLABORATION_WORKSPACE_RPCS.updateSettings).toBe(
      "update_collaboration_workspace_settings"
    );
    expect(COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.updateSettings).toBe(
      "update_collaboration_workspace_settings"
    );
  });

  it("validates auth, manage role, kinds, and writes audit", () => {
    const body = fnBody(sql, "update_collaboration_workspace_settings");
    expect(body).toMatch(/Authentication required/);
    expect(body).toMatch(/can_manage_collaboration_workspace/);
    expect(body).toMatch(/Invalid workspace kind/);
    expect(body).toMatch(/Invalid workspace display_name/);
    expect(body).toMatch(/'team', 'company', 'school', 'academy'/);
    expect(body).toMatch(/workspace\.settings_update/);
    expect(body).toMatch(/collaboration_workspace_audit_write/);
    expect(body).toMatch(/allow_member_invites/);
    expect(body).toMatch(/public_member_directory/);
  });
});

describe("updateCollaborationWorkspaceSettings runtime", () => {
  it("validates input before rpc", async () => {
    const supabase = mockClient({});
    const bad = await updateCollaborationWorkspaceSettings(supabase, {
      workspaceId: "bad",
      displayName: "Acme",
      kind: "team",
    });
    expect(bad.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls settings rpc with sanitized payload", async () => {
    const supabase = mockClient({
      update_collaboration_workspace_settings: {
        data: {
          workspace_id: WS,
          display_name: "Acme Team",
          description: "Hello",
          kind: "company",
          allow_member_invites: true,
          public_member_directory: false,
        },
        error: null,
      },
    });

    const result = await updateCollaborationWorkspaceSettings(supabase, {
      workspaceId: WS,
      displayName: "  Acme Team  ",
      description: "Hello",
      kind: "company",
      allowMemberInvites: true,
      publicMemberDirectory: false,
    });

    expect(result.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_collaboration_workspace_settings",
      expect.objectContaining({
        p_workspace_id: WS,
        p_display_name: "Acme Team",
        p_kind: "company",
        p_allow_member_invites: true,
        p_public_member_directory: false,
      })
    );
  });

  it("surfaces last-owner protection messaging", () => {
    expect(
      sanitizeCollaborationMembershipError(
        "Transfer ownership before leaving the workspace"
      )
    ).toBe("Ownership must be transferred before this membership change.");
    expect(
      sanitizeCollaborationMembershipError(
        "Cannot remove the active owner"
      )
    ).toBe("Ownership must be transferred before this membership change.");
  });
});

describe("Settings page permission-aware rendering contracts", () => {
  it("settings page uses manage helper and lifecycle panel", () => {
    const page = read("app/workspaces/[workspaceId]/settings/page.tsx");
    expect(page).toMatch(/canManageCollaborationWorkspaceSettings/);
    expect(page).toMatch(/WorkspaceSettingsForm/);
    expect(page).toMatch(/WorkspaceLifecyclePanel/);
    expect(page).toMatch(/unauthorizedAction/);

    const panel = read(
      "app/components/collaboration/WorkspaceLifecyclePanel.tsx"
    );
    expect(panel).toMatch(/leaveOwnerBlocked/);
    expect(panel).toMatch(/lastOwnerProtectionBody/);
    expect(panel).toMatch(/canLeaveCollaborationWorkspace/);
    expect(panel).toMatch(/canArchiveCollaborationWorkspace/);
    expect(panel).toMatch(/canTransferCollaborationOwnership/);

    const members = read("app/components/collaboration/MembersList.tsx");
    expect(members).toMatch(/canMutateCollaborationMember/);
    expect(members).toMatch(/suspendCollaborationWorkspaceMemberAction/);
    expect(members).toMatch(/removeCollaborationWorkspaceMemberAction/);
  });
});
