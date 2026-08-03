import { archiveCollaborationWorkspaceAction } from "../../actions/collaboration";
import { COLLABORATION_UI_COPY } from "../../../lib/collaboration/workspaceUi";

type ArchiveWorkspaceFormProps = {
  workspaceId: string;
};

export default function ArchiveWorkspaceForm({
  workspaceId,
}: ArchiveWorkspaceFormProps) {
  return (
    <form
      action={archiveCollaborationWorkspaceAction}
      className="rounded-2xl border border-rose-400/20 bg-rose-500/5 px-4 py-4"
      data-testid="collaboration-archive-form"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h3 className="text-sm font-bold text-rose-100">
        {COLLABORATION_UI_COPY.archiveTitle}
      </h3>
      <p className="mt-2 text-xs leading-6 text-white/55">
        {COLLABORATION_UI_COPY.archiveHelp}
      </p>
      <label className="mt-3 flex items-start gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          name="confirm"
          value="1"
          required
          className="mt-0.5"
        />
        <span>{COLLABORATION_UI_COPY.archiveConfirm}</span>
      </label>
      <button
        type="submit"
        className="watch-focus-ring mt-4 rounded-full border border-rose-300/30 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-50"
      >
        {COLLABORATION_UI_COPY.archiveSubmit}
      </button>
    </form>
  );
}
