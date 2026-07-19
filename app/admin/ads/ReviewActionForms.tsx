type IdField =
  | { kind: "account"; id: string }
  | { kind: "campaign"; id: string }
  | { kind: "creative"; id: string };

type Props = {
  idField: IdField;
  returnTo: string;
  status: string;
  approveAction?: (formData: FormData) => Promise<void>;
  rejectAction?: (formData: FormData) => Promise<void>;
  suspendAction?: (formData: FormData) => Promise<void>;
  restoreAction?: (formData: FormData) => Promise<void>;
  pauseAction?: (formData: FormData) => Promise<void>;
};

function HiddenIds({
  idField,
  returnTo,
}: {
  idField: IdField;
  returnTo: string;
}) {
  const name =
    idField.kind === "account"
      ? "accountId"
      : idField.kind === "campaign"
        ? "campaignId"
        : "creativeId";
  return (
    <>
      <input type="hidden" name={name} value={idField.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}

export default function ReviewActionForms({
  idField,
  returnTo,
  status,
  approveAction,
  rejectAction,
  suspendAction,
  restoreAction,
  pauseAction,
}: Props) {
  const pending = status === "pending_review";
  const suspended = status === "suspended";
  const canPause =
    pauseAction && (status === "approved" || status === "active");
  const canSuspend =
    suspendAction &&
    (status === "approved" ||
      status === "pending_review" ||
      status === "rejected");

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-black">Review actions</h3>
      <p className="text-xs text-white/45">
        Reviewer identity is taken from your signed-in admin session — never from
        the form.
      </p>

      {pending && approveAction ? (
        <form action={approveAction} className="flex flex-wrap gap-2">
          <HiddenIds idField={idField} returnTo={returnTo} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-emerald-400 px-4 py-2 text-sm font-black text-black"
          >
            Approve
          </button>
        </form>
      ) : null}

      {pending && rejectAction ? (
        <form action={rejectAction} className="space-y-2">
          <HiddenIds idField={idField} returnTo={returnTo} />
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Reject reason
            </span>
            <textarea
              name="note"
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 outline-none focus:border-red-400/40"
              placeholder="Explain the rejection for the advertiser…"
            />
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-100"
          >
            Reject
          </button>
        </form>
      ) : null}

      {canSuspend ? (
        <form action={suspendAction} className="space-y-2">
          <HiddenIds idField={idField} returnTo={returnTo} />
          <label className="block space-y-1 text-xs">
            <span className="font-bold uppercase tracking-[0.14em] text-white/45">
              Suspend note (optional)
            </span>
            <input
              name="note"
              maxLength={1000}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 outline-none focus:border-red-400/40"
            />
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
          >
            Suspend
          </button>
        </form>
      ) : null}

      {canPause ? (
        <form action={pauseAction}>
          <HiddenIds idField={idField} returnTo={returnTo} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
          >
            Pause campaign
          </button>
        </form>
      ) : null}

      {suspended && restoreAction ? (
        <form action={restoreAction}>
          <HiddenIds idField={idField} returnTo={returnTo} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            Restore
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function ReviewTimeline({
  events,
}: {
  events: Array<{
    id: string;
    action: string;
    reason: string | null;
    reviewer_id: string | null;
    created_at: string;
  }>;
}) {
  if (events.length === 0) {
    return (
      <p className="mt-3 text-sm text-white/45">No review events yet.</p>
    );
  }
  return (
    <ol className="mt-3 space-y-2 border-l border-white/10 pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-white/40" />
          <p className="text-sm font-bold capitalize">
            {event.action.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-white/45">
            {new Date(event.created_at).toLocaleString()}
            {event.reviewer_id
              ? ` · reviewer ${event.reviewer_id.slice(0, 8)}…`
              : ""}
          </p>
          {event.reason ? (
            <p className="mt-1 text-xs text-white/60">{event.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
