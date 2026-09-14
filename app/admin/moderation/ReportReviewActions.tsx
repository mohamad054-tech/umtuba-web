import {
  banReportedUserAction,
  dismissUgcReportAction,
  removeReportedPostAction,
  suspendReportedUserAction,
} from "../../actions/moderationAdmin";
import PendingSubmitButton from "./PendingSubmitButton";

type Copy = {
  actions: string;
  reasonNote: string;
  reasonPlaceholder: string;
  dismiss: string;
  removePost: string;
  suspend: string;
  ban: string;
  banConfirm: string;
  banConfirmLabel: string;
  working: string;
};

type Props = {
  reportId: string;
  targetUserId: string | null;
  targetPostId: number | null;
  postDeleted: boolean;
  canAct: boolean;
  returnTo: string;
  copy: Copy;
};

function HiddenFields({
  reportId,
  returnTo,
  targetUserId,
  targetPostId,
}: {
  reportId: string;
  returnTo: string;
  targetUserId: string | null;
  targetPostId: number | null;
}) {
  return (
    <>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {targetUserId ? (
        <input type="hidden" name="targetUserId" value={targetUserId} />
      ) : null}
      {targetPostId != null ? (
        <input type="hidden" name="postId" value={String(targetPostId)} />
      ) : null}
    </>
  );
}

function ReasonField({
  copy,
  required = true,
}: {
  copy: Copy;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-bold uppercase tracking-[0.14em] text-white/45">
        {copy.reasonNote}
      </span>
      <textarea
        name="note"
        required={required}
        minLength={3}
        maxLength={2000}
        rows={3}
        className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 outline-none focus:border-violet-400/40"
        placeholder={copy.reasonPlaceholder}
      />
    </label>
  );
}

export default function ReportReviewActions({
  reportId,
  targetUserId,
  targetPostId,
  postDeleted,
  canAct,
  returnTo,
  copy,
}: Props) {
  if (!canAct) {
    return null;
  }

  const fields = {
    reportId,
    returnTo,
    targetUserId,
    targetPostId,
  };

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black">{copy.actions}</h3>

      <form action={dismissUgcReportAction} className="space-y-2">
        <HiddenFields {...fields} />
        <ReasonField copy={copy} />
        <PendingSubmitButton
          label={copy.dismiss}
          pendingLabel={copy.working}
          className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </form>

      {targetPostId != null && !postDeleted ? (
        <form action={removeReportedPostAction} className="space-y-2">
          <HiddenFields {...fields} />
          <ReasonField copy={copy} />
          <PendingSubmitButton
            label={copy.removePost}
            pendingLabel={copy.working}
            className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}

      {targetUserId ? (
        <form action={suspendReportedUserAction} className="space-y-2">
          <HiddenFields {...fields} />
          <ReasonField copy={copy} />
          <PendingSubmitButton
            label={copy.suspend}
            pendingLabel={copy.working}
            className="watch-focus-ring rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}

      {targetUserId ? (
        <form action={banReportedUserAction} className="space-y-2">
          <HiddenFields {...fields} />
          <p className="text-xs text-red-100">{copy.banConfirm}</p>
          <label className="flex items-start gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              name="confirmBan"
              value="1"
              required
              className="mt-0.5 h-4 w-4 rounded border-white/30 bg-black/40"
            />
            <span>{copy.banConfirmLabel}</span>
          </label>
          <ReasonField copy={copy} />
          <PendingSubmitButton
            label={copy.ban}
            pendingLabel={copy.working}
            className="watch-focus-ring rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </form>
      ) : null}
    </div>
  );
}
