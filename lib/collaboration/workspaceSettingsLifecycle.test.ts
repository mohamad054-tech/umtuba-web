import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLABORATION_PROFILE_EDIT_UNSUPPORTED_MESSAGE,
  rejectUnsupportedCollaborationProfileEdit,
  resolveCollaborationLifecycleCapabilities,
} from "./workspaceSettingsLifecycle";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canActivateCollaborationWorkspace,
  canArchiveCollaborationWorkspace,
  canLeaveCollaborationWorkspace,
  canManageCollaborationWorkspace,
} from "./workspaceUi";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Settings & Lifecycle UI V1", () => {
  it("adds settings route and owner/admin permission helpers", () => {
    expect(COLLABORATION_UI_ROUTES.settings("ws-1")).toBe(
      "/workspaces/ws-1/settings"
    );
    expect(canManageCollaborationWorkspace("owner")).toBe(true);
    expect(canManageCollaborationWorkspace("admin")).toBe(true);
    expect(canManageCollaborationWorkspace("manager")).toBe(false);
    expect(canManageCollaborationWorkspace("member")).toBe(false);

    expect(canArchiveCollaborationWorkspace("owner")).toBe(true);
    expect(canArchiveCollaborationWorkspace("admin")).toBe(false);
    expect(canActivateCollaborationWorkspace("owner")).toBe(true);
    expect(canLeaveCollaborationWorkspace("member")).toBe(true);
    expect(canLeaveCollaborationWorkspace("owner")).toBe(false);
  });

  it("resolves lifecycle capabilities with status guards", () => {
    expect(
      resolveCollaborationLifecycleCapabilities({
        role: "owner",
        status: "active",
      })
    ).toEqual({
      canManageSettings: true,
      canArchive: true,
      canActivate: false,
      canLeave: false,
      profileEditable: false,
    });

    expect(
      resolveCollaborationLifecycleCapabilities({
        role: "owner",
        status: "draft",
      })
    ).toMatchObject({ canActivate: true, canArchive: true });

    expect(
      resolveCollaborationLifecycleCapabilities({
        role: "owner",
        status: "archived",
      })
    ).toMatchObject({ canArchive: false, canActivate: false });

    expect(
      resolveCollaborationLifecycleCapabilities({
        role: "member",
        status: "active",
      })
    ).toEqual({
      canManageSettings: false,
      canArchive: false,
      canActivate: false,
      canLeave: true,
      profileEditable: false,
    });
  });

  it("fail-closes unsupported profile edits", () => {
    expect(rejectUnsupportedCollaborationProfileEdit()).toEqual({
      ok: false,
      message: COLLABORATION_PROFILE_EDIT_UNSUPPORTED_MESSAGE,
    });
    expect(COLLABORATION_UI_COPY.profileEditUnsupported).toMatch(/غير مدعوم/);
  });

  it("ships settings page, panel, lifecycle forms, and action wiring", () => {
    const files = [
      "app/workspaces/[workspaceId]/settings/page.tsx",
      "app/components/collaboration/WorkspaceSettingsPanel.tsx",
      "app/components/collaboration/ArchiveWorkspaceForm.tsx",
      "app/components/collaboration/ActivateWorkspaceForm.tsx",
      "app/components/collaboration/LeaveWorkspaceForm.tsx",
      "lib/collaboration/workspaceSettingsLifecycle.ts",
    ];
    for (const rel of files) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }

    const page = read("app/workspaces/[workspaceId]/settings/page.tsx");
    expect(page).toMatch(/canManageCollaborationWorkspace/);
    expect(page).toMatch(/settingsDenied|COLLABORATION_UI_COPY\.settingsDenied/);
    expect(page).toMatch(/resolveCollaborationLifecycleCapabilities/);

    const actions = read("app/actions/collaboration.ts");
    expect(actions).toMatch(/archiveCollaborationWorkspaceAction/);
    expect(actions).toMatch(/activateCollaborationWorkspaceAction/);
    expect(actions).toMatch(/leaveCollaborationWorkspaceAction/);
    expect(actions).toMatch(/updateCollaborationWorkspaceProfileAction/);
    expect(actions).toMatch(/rejectUnsupportedCollaborationProfileEdit/);
    expect(actions).toMatch(/rejectIfCollaborationPlatformDisabled/);

    const shell = read("app/components/collaboration/CollaborationShell.tsx");
    expect(shell).toMatch(/COLLABORATION_UI_ROUTES\.settings/);

    const runtime = read("lib/collaboration/workspaceMembershipRuntime.ts");
    expect(runtime).toMatch(/activateCollaborationWorkspace/);
    expect(runtime).toMatch(/archiveCollaborationWorkspace/);

    const panel = read(
      "app/components/collaboration/WorkspaceSettingsPanel.tsx"
    );
    expect(panel).not.toMatch(/<input[^>]+name=["']displayName["']/);
    expect(panel).toMatch(/collaboration-profile-readonly/);
  });
});
