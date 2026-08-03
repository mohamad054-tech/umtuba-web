"use client";

import { useActionState } from "react";
import {
  archiveCollaborationWorkspaceAction,
  leaveCollaborationWorkspaceAction,
  transferCollaborationWorkspaceOwnershipAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import type { CollaborationWorkspaceMemberRow } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  canArchiveCollaborationWorkspace,
  canLeaveCollaborationWorkspace,
  canTransferCollaborationOwnership,
  collaborationRoleLabel,
  shortenCollaborationId,
} from "../../../lib/collaboration/workspaceUi";
import type { CollaborationWorkspaceRole } from "../../../lib/collaboration/workspaceSpineFoundation";

const initialState: CollaborationActionState = { ok: false };

type WorkspaceLifecyclePanelProps = {
  workspaceId: string;
  myRole: CollaborationWorkspaceRole;
  members: CollaborationWorkspaceMemberRow[];
  currentUserId: string;
};

export default function WorkspaceLifecyclePanel({
  workspaceId,
  myRole,
  members,
  currentUserId,
}: WorkspaceLifecyclePanelProps) {
  const [leaveState, leaveAction, leavePending] = useActionState(
    leaveCollaborationWorkspaceAction,
    initialState
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCollaborationWorkspaceAction,
    initialState
  );
  const [transferState, transferAction, transferPending] = useActionState(
    transferCollaborationWorkspaceOwnershipAction,
    initialState
  );

  const canLeave = canLeaveCollaborationWorkspace(myRole);
  const canArchive = canArchiveCollaborationWorkspace(myRole);
  const canTransfer = canTransferCollaborationOwnership(myRole);
  const transferCandidates = members.filter(
    (member) =>
      member.status === "active" &&
      member.userId !== currentUserId &&
      member.role !== "owner"
  );

  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <div>
        <h2 className="text-sm font-black">
          {COLLABORATION_UI_COPY.lifecycleTitle}
        </h2>
        <p className="mt-2 text-xs leading-6 text-white/50">
          <span className="font-bold text-white/70">
            {COLLABORATION_UI_COPY.lastOwnerProtectionTitle}:{" "}
          </span>
          {COLLABORATION_UI_COPY.lastOwnerProtectionBody}
        </p>
      </div>

      {canTransfer ? (
        <form action={transferAction} className="space-y-3 border-t border-white/10 pt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <h3 className="text-xs font-bold text-white/70">
            {COLLABORATION_UI_COPY.transferOwnership}
          </h3>
          {transferCandidates.length === 0 ? (
            <p className="text-xs text-white/45">
              لا يوجد عضو نشط آخر لنقل الملكية إليه.
            </p>
          ) : (
            <>
              <label
                htmlFor="transfer-owner"
                className="text-[11px] font-bold text-white/45"
              >
                {COLLABORATION_UI_COPY.transferTargetLabel}
              </label>
              <select
                id="transfer-owner"
                name="newOwnerUserId"
                required
                className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
              >
                {transferCandidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {shortenCollaborationId(member.userId)} ·{" "}
                    {collaborationRoleLabel(member.role)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={transferPending}
                className="watch-focus-ring rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 disabled:opacity-50"
              >
                {transferPending
                  ? COLLABORATION_UI_COPY.loading
                  : COLLABORATION_UI_COPY.transferOwnership}
              </button>
            </>
          )}
          {transferState?.message ? (
            <p
              className={`rounded-xl border px-3 py-2 text-xs ${
                transferState.ok
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-100"
              }`}
              role={transferState.ok ? "status" : "alert"}
            >
              {transferState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {canLeave ? (
        <form action={leaveAction} className="space-y-3 border-t border-white/10 pt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <button
            type="submit"
            disabled={leavePending}
            className="watch-focus-ring rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-black text-white/85 disabled:opacity-50"
          >
            {leavePending
              ? COLLABORATION_UI_COPY.loading
              : COLLABORATION_UI_COPY.leaveWorkspace}
          </button>
          {leaveState?.message ? (
            <p
              className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"
              role="alert"
            >
              {leaveState.message}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-xs font-bold text-white/70">
            {COLLABORATION_UI_COPY.leaveWorkspace}
          </p>
          <p className="text-xs leading-6 text-amber-100/90">
            {COLLABORATION_UI_COPY.leaveOwnerBlocked}
          </p>
        </div>
      )}

      {canArchive ? (
        <form action={archiveAction} className="space-y-3 border-t border-white/10 pt-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <button
            type="submit"
            disabled={archivePending}
            className="watch-focus-ring rounded-full border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-100 disabled:opacity-50"
          >
            {archivePending
              ? COLLABORATION_UI_COPY.loading
              : COLLABORATION_UI_COPY.archiveWorkspace}
          </button>
          {archiveState?.message ? (
            <p
              className={`rounded-xl border px-3 py-2 text-xs ${
                archiveState.ok
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-100"
              }`}
              role={archiveState.ok ? "status" : "alert"}
            >
              {archiveState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
