import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLLABORATION_PLATFORM_ENABLED } from "./workspaceSpineFoundation";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canChangeCollaborationMemberRole,
  canManageCollaborationInvites,
  canViewCollaborationInvites,
  collaborationAssignableMemberRolesForActor,
  collaborationKindLabel,
  collaborationRoleLabel,
  collaborationStatusLabel,
  isCollaborationAssignableMemberRole,
  isCollaborationInviteRole,
  shortenCollaborationId,
} from "./workspaceUi";

const ROOT = process.cwd();

describe("Collaboration Workspace UI Foundation V1", () => {
  it("keeps platform default off and ships RTL Arabic copy", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect(COLLABORATION_UI_COPY.workspacesTitle).toMatch(/مساحات/);
    expect(COLLABORATION_UI_COPY.createCta).toMatch(/إنشاء/);
    expect(COLLABORATION_UI_ROUTES.root).toBe("/workspaces");
    expect(COLLABORATION_UI_ROUTES.members("abc")).toBe(
      "/workspaces/abc/members"
    );
    expect(COLLABORATION_UI_ROUTES.settings("abc")).toBe(
      "/workspaces/abc/settings"
    );
  });

  it("labels kinds/roles/statuses for UI", () => {
    expect(collaborationKindLabel("school")).toBe("مدرسة");
    expect(collaborationRoleLabel("owner")).toBe("مالك");
    expect(collaborationStatusLabel("active")).toBe("نشطة");
    expect(isCollaborationInviteRole("member")).toBe(true);
    expect(isCollaborationInviteRole("owner")).toBe(false);
    expect(isCollaborationAssignableMemberRole("admin")).toBe(true);
    expect(isCollaborationAssignableMemberRole("owner")).toBe(false);
    expect(collaborationAssignableMemberRolesForActor("manager")).toEqual([
      "manager",
      "billing_manager",
      "member",
      "auditor",
    ]);
    expect(
      canChangeCollaborationMemberRole(
        "admin",
        "member",
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        "active"
      )
    ).toBe(true);
    expect(
      canChangeCollaborationMemberRole(
        "admin",
        "owner",
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        "active"
      )
    ).toBe(false);
    expect(canManageCollaborationInvites("manager")).toBe(true);
    expect(canViewCollaborationInvites("member")).toBe(false);
    expect(
      shortenCollaborationId("11111111-1111-4111-8111-111111111111")
    ).toMatch(/…/);
  });

  it("ships workspaces pages and collaboration components", () => {
    const files = [
      "app/workspaces/page.tsx",
      "app/workspaces/invite/page.tsx",
      "app/workspaces/[workspaceId]/page.tsx",
      "app/workspaces/[workspaceId]/members/page.tsx",
      "app/workspaces/[workspaceId]/invites/page.tsx",
      "app/workspaces/[workspaceId]/settings/page.tsx",
      "app/components/collaboration/CollaborationShell.tsx",
      "app/components/collaboration/WorkspaceCard.tsx",
      "app/components/collaboration/WorkspaceSwitcher.tsx",
      "app/components/collaboration/WorkspaceList.tsx",
      "app/components/collaboration/MembersList.tsx",
      "app/components/collaboration/InvitationsList.tsx",
      "app/components/collaboration/CreateWorkspaceDialog.tsx",
      "app/components/collaboration/WorkspaceSettingsForm.tsx",
      "app/components/collaboration/WorkspaceLifecyclePanel.tsx",
      "app/actions/collaboration.ts",
      "lib/collaboration/workspaceQueries.ts",
    ];
    for (const rel of files) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
  });

  it("shell is RTL and create dialog uses membership runtime", () => {
    const shell = readFileSync(
      join(ROOT, "app/components/collaboration/CollaborationShell.tsx"),
      "utf8"
    );
    expect(shell).toMatch(/dir="rtl"/);
    expect(shell).toMatch(/lang="ar"/);

    const dialog = readFileSync(
      join(ROOT, "app/components/collaboration/CreateWorkspaceDialog.tsx"),
      "utf8"
    );
    expect(dialog).toMatch(/createCollaborationWorkspaceAction/);
    expect(dialog).toMatch(/useDialogA11y/);

    const actions = readFileSync(
      join(ROOT, "app/actions/collaboration.ts"),
      "utf8"
    );
    expect(actions).toMatch(/createCollaborationWorkspace/);
    expect(actions).toMatch(/inviteCollaborationWorkspaceMember/);
    expect(actions).toMatch(/revokeCollaborationWorkspaceInvite/);
    expect(actions).toMatch(/updateCollaborationWorkspaceSettings/);
    expect(actions).toMatch(/updateCollaborationWorkspaceMemberRole/);
    expect(actions).toMatch(/leaveCollaborationWorkspace/);
    expect(actions).not.toMatch(/learning_/);
    expect(actions).not.toMatch(/from\("stores"\)/);

    const membersList = readFileSync(
      join(ROOT, "app/components/collaboration/MembersList.tsx"),
      "utf8"
    );
    expect(membersList).toMatch(/updateCollaborationWorkspaceMemberRoleAction/);
    expect(membersList).toMatch(/collaborationAssignableMemberRolesForActor/);
  });
});
