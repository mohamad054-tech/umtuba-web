import { revokeCollaborationWorkspaceInviteAction } from "../../actions/collaboration";
import type { CollaborationWorkspaceInviteRow } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  collaborationRoleLabel,
} from "../../../lib/collaboration/workspaceUi";

type InvitationsListProps = {
  workspaceId: string;
  invites: CollaborationWorkspaceInviteRow[];
  canRevoke?: boolean;
};

export default function InvitationsList({
  workspaceId,
  invites,
  canRevoke = false,
}: InvitationsListProps) {
  if (invites.length === 0) {
    return (
      <div
        className="rounded-[28px] border border-dashed border-white/15 bg-[#080816]/80 px-5 py-8 text-center"
        role="status"
      >
        <p className="text-sm font-bold text-white/80">
          {COLLABORATION_UI_COPY.invitesEmpty}
        </p>
      </div>
    );
  }

  return (
    <ul
      className="divide-y divide-white/10 overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/80"
      aria-label={COLLABORATION_UI_COPY.invitesTitle}
    >
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold" dir="ltr">
              {invite.invitedEmail ?? invite.invitedUserId ?? invite.id}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {collaborationRoleLabel(invite.role)} · تنتهي{" "}
              <span dir="ltr">
                {new Date(invite.expiresAt).toLocaleDateString("ar")}
              </span>
            </p>
          </div>
          {canRevoke ? (
            <form action={revokeCollaborationWorkspaceInviteAction}>
              <input type="hidden" name="inviteId" value={invite.id} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[11px] font-bold text-rose-100"
              >
                {COLLABORATION_UI_COPY.revokeInvite}
              </button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
