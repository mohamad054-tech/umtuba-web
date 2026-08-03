import { activateCollaborationWorkspaceAction } from "../../actions/collaboration";
import { COLLABORATION_UI_COPY } from "../../../lib/collaboration/workspaceUi";

type ActivateWorkspaceFormProps = {
  workspaceId: string;
};

export default function ActivateWorkspaceForm({
  workspaceId,
}: ActivateWorkspaceFormProps) {
  return (
    <form
      action={activateCollaborationWorkspaceAction}
      className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-4"
      data-testid="collaboration-activate-form"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h3 className="text-sm font-bold text-emerald-100">
        {COLLABORATION_UI_COPY.activateTitle}
      </h3>
      <p className="mt-2 text-xs leading-6 text-white/55">
        {COLLABORATION_UI_COPY.activateHelp}
      </p>
      <button
        type="submit"
        className="watch-focus-ring mt-4 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-50"
      >
        {COLLABORATION_UI_COPY.activateSubmit}
      </button>
    </form>
  );
}
