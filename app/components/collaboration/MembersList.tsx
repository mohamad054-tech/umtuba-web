"use client";

import { useActionState } from "react";
import {
  removeCollaborationWorkspaceMemberAction,
  suspendCollaborationWorkspaceMemberAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import type { CollaborationWorkspaceMemberRow } from "../../../lib/collaboration/workspaceQueries";
import type { CollaborationWorkspaceRole } from "../../../lib/collaboration/workspaceSpineFoundation";
import {
  COLLABORATION_UI_COPY,
  canMutateCollaborationMember,
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

  if (!canMutate) {
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
      data-testid="collaboration-members-list"
    >
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
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
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/75">
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
