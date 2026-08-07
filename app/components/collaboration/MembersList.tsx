"use client";

import { useActionState } from "react";
import {
  removeCollaborationWorkspaceMemberAction,
  suspendCollaborationWorkspaceMemberAction,
  updateCollaborationWorkspaceMemberRoleAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import type { CollaborationWorkspaceMemberRow } from "../../../lib/collaboration/workspaceQueries";
import type { CollaborationWorkspaceRole } from "../../../lib/collaboration/workspaceSpineFoundation";
import {
  COLLABORATION_UI_COPY,
  canChangeCollaborationMemberRole,
  canMutateCollaborationMember,
  collaborationAssignableMemberRolesForActor,
  collaborationRoleLabel,
  shortenCollaborationId,
} from "../../../lib/collaboration/workspaceUi";

const initialState: CollaborationActionState = { ok: false };

type MembersListProps = {
  members: CollaborationWorkspaceMemberRow[];
  workspaceId: string;
  currentUserId: string;
  myRole: CollaborationWorkspaceRole;
};

function MemberRoleForm({
  workspaceId,
  member,
  myRole,
}: {
  workspaceId: string;
  member: CollaborationWorkspaceMemberRow;
  myRole: CollaborationWorkspaceRole;
}) {
  const [state, action, pending] = useActionState(
    updateCollaborationWorkspaceMemberRoleAction,
    initialState
  );
  const roles = collaborationAssignableMemberRolesForActor(myRole);
  if (roles.length === 0) return null;

  const defaultRole = roles.includes(
    member.role as (typeof roles)[number]
  )
    ? member.role
    : roles[0];

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="userId" value={member.userId} />
      <label className="sr-only" htmlFor={`role-${member.userId}`}>
        {COLLABORATION_UI_COPY.roleSelectLabel}
      </label>
      <select
        id={`role-${member.userId}`}
        name="role"
        defaultValue={defaultRole}
        disabled={pending}
        className="watch-focus-ring rounded-full border border-white/15 bg-[#0b0b18] px-3 py-1 text-[11px] font-bold text-white/85 disabled:opacity-50"
        aria-label={COLLABORATION_UI_COPY.roleSelectLabel}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {collaborationRoleLabel(role)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold text-cyan-50 disabled:opacity-50"
      >
        {pending
          ? COLLABORATION_UI_COPY.loading
          : COLLABORATION_UI_COPY.updateMemberRole}
      </button>
      {state?.message ? (
        <p
          className={`w-full text-[11px] ${
            state.ok ? "text-emerald-200" : "text-rose-200"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function MemberActions({
  workspaceId,
  member,
  currentUserId,
  myRole,
}: {
  workspaceId: string;
  member: CollaborationWorkspaceMemberRow;
  currentUserId: string;
  myRole: CollaborationWorkspaceRole;
}) {
  const [suspendState, suspendAction, suspendPending] = useActionState(
    suspendCollaborationWorkspaceMemberAction,
    initialState
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeCollaborationWorkspaceMemberAction,
    initialState
  );

  const canMutate = canMutateCollaborationMember(
    myRole,
    member.role,
    member.userId,
    currentUserId
  );
  const canChangeRole = canChangeCollaborationMemberRole(
    myRole,
    member.role,
    member.userId,
    currentUserId,
    member.status
  );

  if (!canMutate && !canChangeRole) {
    if (member.role === "owner") {
      return (
        <p className="max-w-[14rem] text-[11px] leading-5 text-white/40">
          {COLLABORATION_UI_COPY.lastOwnerProtectionBody}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {canChangeRole ? (
        <MemberRoleForm
          workspaceId={workspaceId}
          member={member}
          myRole={myRole}
        />
      ) : null}
      {canMutate ? (
        <div className="flex flex-wrap justify-end gap-2">
          {member.status === "active" ? (
            <form action={suspendAction}>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="userId" value={member.userId} />
              <button
                type="submit"
                disabled={suspendPending}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/75 disabled:opacity-50"
              >
                {suspendPending
                  ? COLLABORATION_UI_COPY.loading
                  : COLLABORATION_UI_COPY.suspendMember}
              </button>
            </form>
          ) : null}
          <form action={removeAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="userId" value={member.userId} />
            <button
              type="submit"
              disabled={removePending}
              className="watch-focus-ring rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1 text-[11px] font-bold text-rose-100 disabled:opacity-50"
            >
              {removePending
                ? COLLABORATION_UI_COPY.loading
                : COLLABORATION_UI_COPY.removeMember}
            </button>
          </form>
        </div>
      ) : null}
      {suspendState?.message && !suspendState.ok ? (
        <p className="text-[11px] text-rose-200" role="alert">
          {suspendState.message}
        </p>
      ) : null}
      {removeState?.message && !removeState.ok ? (
        <p className="text-[11px] text-rose-200" role="alert">
          {removeState.message}
        </p>
      ) : null}
    </div>
  );
}

export default function MembersList({
  members,
  workspaceId,
  currentUserId,
  myRole,
}: MembersListProps) {
  if (members.length === 0) {
    return (
      <div
        className="rounded-[28px] border border-dashed border-white/15 bg-[#080816]/80 px-5 py-8 text-center"
        role="status"
      >
        <p className="text-sm font-bold text-white/80">
          {COLLABORATION_UI_COPY.membersEmpty}
        </p>
      </div>
    );
  }

  return (
    <ul
      className="divide-y divide-white/10 overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/80"
      aria-label={COLLABORATION_UI_COPY.membersTitle}
    >
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          data-testid="collaboration-member-row"
        >
          <div>
            <p className="text-sm font-bold" dir="ltr">
              {shortenCollaborationId(member.userId)}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {member.status === "active" ? "نشط" : "معلّق"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/75"
              data-testid="collaboration-member-role"
            >
              {collaborationRoleLabel(member.role)}
            </span>
            <MemberActions
              workspaceId={workspaceId}
              member={member}
              currentUserId={currentUserId}
              myRole={myRole}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
