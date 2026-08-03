"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  COLLABORATION_PLATFORM_DISABLED_MESSAGE,
  rejectIfCollaborationPlatformDisabled,
} from "../../lib/collaboration/collaborationPlatformGate";
import {
  acceptCollaborationWorkspaceInvite,
  archiveCollaborationWorkspace,
  createCollaborationWorkspace,
  declineCollaborationWorkspaceInvite,
  inviteCollaborationWorkspaceMember,
  leaveCollaborationWorkspace,
  removeCollaborationWorkspaceMember,
  revokeCollaborationWorkspaceInvite,
  suspendCollaborationWorkspaceMember,
  transferCollaborationWorkspaceOwnership,
  updateCollaborationWorkspaceSettings,
} from "../../lib/collaboration/workspaceMembershipRuntime";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  isCollaborationInviteRole,
} from "../../lib/collaboration/workspaceUi";
import { COLLABORATION_WORKSPACE_KINDS } from "../../lib/collaboration/workspaceSpineFoundation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function revalidateWorkspaces(workspaceId?: string) {
  revalidatePath(COLLABORATION_UI_ROUTES.root);
  if (workspaceId) {
    revalidatePath(COLLABORATION_UI_ROUTES.workspace(workspaceId));
    revalidatePath(COLLABORATION_UI_ROUTES.members(workspaceId));
    revalidatePath(COLLABORATION_UI_ROUTES.invites(workspaceId));
    revalidatePath(COLLABORATION_UI_ROUTES.settings(workspaceId));
  }
}

async function requireUser() {
  return getServerUser();
}

export type CollaborationActionState = {
  ok: boolean;
  message?: string;
  inviteToken?: string;
  workspaceId?: string;
};

export async function createCollaborationWorkspaceAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const slug = String(formData.get("slug") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (
    !(COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(kind)
  ) {
    return { ok: false, message: "Invalid workspace kind" };
  }

  const supabase = await createClient();
  const result = await createCollaborationWorkspace(supabase, {
    slug,
    displayName,
    kind,
    description,
    activate: true,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(result.data.workspace_id);
  redirect(COLLABORATION_UI_ROUTES.workspace(result.data.workspace_id));
}

export async function inviteCollaborationWorkspaceMemberAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const role = String(formData.get("role") ?? "");
  const invitedEmail = String(formData.get("invitedEmail") ?? "").trim();

  if (!isCollaborationInviteRole(role)) {
    return { ok: false, message: "Invalid invite role" };
  }

  const supabase = await createClient();
  const result = await inviteCollaborationWorkspaceMember(supabase, {
    workspaceId,
    role,
    invitedEmail,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return {
    ok: true,
    message: "تم إنشاء الدعوة. انسخ الرمز الآن — يظهر مرة واحدة فقط.",
    inviteToken: result.data.token,
    workspaceId,
  };
}

export async function revokeCollaborationWorkspaceInviteAction(
  formData: FormData
): Promise<void> {
  if (rejectIfCollaborationPlatformDisabled()) {
    return;
  }

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const inviteId = String(formData.get("inviteId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const supabase = await createClient();
  await revokeCollaborationWorkspaceInvite(supabase, inviteId);
  revalidateWorkspaces(workspaceId);
  redirect(`${COLLABORATION_UI_ROUTES.invites(workspaceId)}?revoked=1`);
}

export async function acceptCollaborationWorkspaceInviteAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.inviteRedeem}`
    );
  }

  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const result = await acceptCollaborationWorkspaceInvite(supabase, token);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(result.data.workspace_id);
  redirect(COLLABORATION_UI_ROUTES.workspace(result.data.workspace_id));
}

export async function declineCollaborationWorkspaceInviteAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.inviteRedeem}`
    );
  }

  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const result = await declineCollaborationWorkspaceInvite(supabase, token);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces();
  return { ok: true, message: "تم رفض الدعوة." };
}

export async function updateCollaborationWorkspaceSettingsAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "");
  const allowMemberInvites = formData.get("allowMemberInvites") === "on";
  const publicMemberDirectory =
    formData.get("publicMemberDirectory") === "on";

  if (
    !(COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(kind)
  ) {
    return { ok: false, message: "Invalid workspace kind" };
  }

  const supabase = await createClient();
  const result = await updateCollaborationWorkspaceSettings(supabase, {
    workspaceId,
    displayName,
    kind,
    description,
    allowMemberInvites,
    publicMemberDirectory,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return {
    ok: true,
    message: COLLABORATION_UI_COPY.settingsSaved,
    workspaceId,
  };
}

export async function leaveCollaborationWorkspaceAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const supabase = await createClient();
  const result = await leaveCollaborationWorkspace(supabase, workspaceId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  redirect(COLLABORATION_UI_ROUTES.root);
}

export async function archiveCollaborationWorkspaceAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const supabase = await createClient();
  const result = await archiveCollaborationWorkspace(supabase, workspaceId);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return {
    ok: true,
    message: "تم أرشفة مساحة العمل.",
    workspaceId,
  };
}

export async function transferCollaborationWorkspaceOwnershipAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const newOwnerUserId = String(formData.get("newOwnerUserId") ?? "");
  const supabase = await createClient();
  const result = await transferCollaborationWorkspaceOwnership(
    supabase,
    workspaceId,
    newOwnerUserId
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return {
    ok: true,
    message: "تم نقل ملكية مساحة العمل.",
    workspaceId,
  };
}

export async function suspendCollaborationWorkspaceMemberAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const supabase = await createClient();
  const result = await suspendCollaborationWorkspaceMember(
    supabase,
    workspaceId,
    targetUserId
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return { ok: true, message: "تم تعليق العضو.", workspaceId };
}

export async function removeCollaborationWorkspaceMemberAction(
  _prev: CollaborationActionState | null,
  formData: FormData
): Promise<CollaborationActionState> {
  const disabled = rejectIfCollaborationPlatformDisabled();
  if (disabled) return disabled;

  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const targetUserId = String(formData.get("userId") ?? "");
  const supabase = await createClient();
  const result = await removeCollaborationWorkspaceMember(
    supabase,
    workspaceId,
    targetUserId
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateWorkspaces(workspaceId);
  return { ok: true, message: "تم إزالة العضو.", workspaceId };
}

/** Exported for tests — must stay aligned with action fail-closed copy. */
export const COLLABORATION_ACTION_DISABLED_MESSAGE =
  COLLABORATION_PLATFORM_DISABLED_MESSAGE;
