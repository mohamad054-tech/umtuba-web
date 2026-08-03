/**
 * Collaboration Settings & Lifecycle UI V1 — presentation helpers.
 * No invented mutations: profile edit is explicitly unsupported.
 */

import type { CollaborationWorkspaceStatus } from "./workspaceSpineFoundation";
import {
  canActivateCollaborationWorkspace,
  canArchiveCollaborationWorkspace,
  canLeaveCollaborationWorkspace,
  canManageCollaborationWorkspace,
} from "./workspaceUi";

export const COLLABORATION_PROFILE_EDIT_UNSUPPORTED_MESSAGE =
  "Workspace profile edits are not supported." as const;

export type CollaborationLifecycleCapabilities = {
  canManageSettings: boolean;
  canArchive: boolean;
  canActivate: boolean;
  canLeave: boolean;
  profileEditable: false;
};

export function resolveCollaborationLifecycleCapabilities(input: {
  role: string;
  status: string;
}): CollaborationLifecycleCapabilities {
  const status = input.status as CollaborationWorkspaceStatus | string;
  const archived = status === "archived";
  const draft = status === "draft";

  return {
    canManageSettings: canManageCollaborationWorkspace(input.role),
    canArchive: canArchiveCollaborationWorkspace(input.role) && !archived,
    canActivate: canActivateCollaborationWorkspace(input.role) && draft,
    canLeave:
      canLeaveCollaborationWorkspace(input.role) &&
      status === "active" &&
      !archived,
    profileEditable: false,
  };
}

/** Fail-closed guard for any attempted profile mutation in UI/actions. */
export function rejectUnsupportedCollaborationProfileEdit(): {
  ok: false;
  message: typeof COLLABORATION_PROFILE_EDIT_UNSUPPORTED_MESSAGE;
} {
  return {
    ok: false,
    message: COLLABORATION_PROFILE_EDIT_UNSUPPORTED_MESSAGE,
  };
}
