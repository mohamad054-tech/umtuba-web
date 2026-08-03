import { leaveCollaborationWorkspaceAction } from "../../actions/collaboration";
import { COLLABORATION_UI_COPY } from "../../../lib/collaboration/workspaceUi";

type LeaveWorkspaceFormProps = {
  workspaceId: string;
};

export default function LeaveWorkspaceForm({
  workspaceId,
}: LeaveWorkspaceFormProps) {
  return (
    <form
      action={leaveCollaborationWorkspaceAction}
      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
      data-testid="collaboration-leave-form"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h3 className="text-sm font-bold text-white/85">
        {COLLABORATION_UI_COPY.leaveTitle}
      </h3>
      <p className="mt-2 text-xs leading-6 text-white/55">
        {COLLABORATION_UI_COPY.leaveHelp}
      </p>
      <button
        type="submit"
        className="watch-focus-ring mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80"
      >
        {COLLABORATION_UI_COPY.leaveSubmit}
      </button>
    </form>
  );
}
