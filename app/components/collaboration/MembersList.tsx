import type { CollaborationWorkspaceMemberRow } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  collaborationRoleLabel,
  shortenCollaborationId,
} from "../../../lib/collaboration/workspaceUi";

type MembersListProps = {
  members: CollaborationWorkspaceMemberRow[];
};

export default function MembersList({ members }: MembersListProps) {
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
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/75">
            {collaborationRoleLabel(member.role)}
          </span>
        </li>
      ))}
    </ul>
  );
}
