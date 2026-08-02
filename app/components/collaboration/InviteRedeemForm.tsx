"use client";

import { useActionState } from "react";
import {
  acceptCollaborationWorkspaceInviteAction,
  declineCollaborationWorkspaceInviteAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import { COLLABORATION_UI_COPY } from "../../../lib/collaboration/workspaceUi";

const initialState: CollaborationActionState = { ok: false };

export default function InviteRedeemForm() {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptCollaborationWorkspaceInviteAction,
    initialState
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineCollaborationWorkspaceInviteAction,
    initialState
  );

  const message = acceptState?.message || declineState?.message;
  const ok = Boolean(acceptState?.ok || declineState?.ok);

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <h1 className="text-xl font-black tracking-tight">
        {COLLABORATION_UI_COPY.inviteRedeemTitle}
      </h1>

      <form action={acceptAction} className="space-y-3">
        <div>
          <label
            htmlFor="invite-token"
            className="text-[11px] font-bold text-white/45"
          >
            {COLLABORATION_UI_COPY.inviteTokenLabel}
          </label>
          <input
            id="invite-token"
            name="token"
            required
            dir="ltr"
            className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
          />
        </div>

        {message ? (
          <p
            className={`rounded-xl border px-3 py-2 text-xs ${
              ok
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/30 bg-rose-400/10 text-rose-100"
            }`}
            role={ok ? "status" : "alert"}
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={acceptPending}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50"
          >
            {acceptPending
              ? COLLABORATION_UI_COPY.loading
              : COLLABORATION_UI_COPY.acceptInvite}
          </button>
          <button
            type="submit"
            formAction={declineAction}
            disabled={declinePending}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 disabled:opacity-50"
          >
            {declinePending
              ? COLLABORATION_UI_COPY.loading
              : COLLABORATION_UI_COPY.declineInvite}
          </button>
        </div>
      </form>
    </div>
  );
}
