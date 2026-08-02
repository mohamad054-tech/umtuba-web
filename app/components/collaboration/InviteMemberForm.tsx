"use client";

import { useActionState } from "react";
import {
  inviteCollaborationWorkspaceMemberAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import { COLLABORATION_WORKSPACE_INVITE_ROLES } from "../../../lib/collaboration/workspaceSpineFoundation";
import {
  COLLABORATION_ROLE_LABELS,
  COLLABORATION_UI_COPY,
} from "../../../lib/collaboration/workspaceUi";

const initialState: CollaborationActionState = { ok: false };

type InviteMemberFormProps = {
  workspaceId: string;
};

export default function InviteMemberForm({
  workspaceId,
}: InviteMemberFormProps) {
  const [state, formAction, pending] = useActionState(
    inviteCollaborationWorkspaceMemberAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h2 className="text-sm font-black">{COLLABORATION_UI_COPY.inviteCreate}</h2>

      <div>
        <label
          htmlFor="invite-email"
          className="text-[11px] font-bold text-white/45"
        >
          {COLLABORATION_UI_COPY.emailLabel}
        </label>
        <input
          id="invite-email"
          name="invitedEmail"
          type="email"
          required
          dir="ltr"
          className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="invite-role"
          className="text-[11px] font-bold text-white/45"
        >
          {COLLABORATION_UI_COPY.roleLabel}
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="member"
          className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
        >
          {COLLABORATION_WORKSPACE_INVITE_ROLES.map((role) => (
            <option key={role} value={role}>
              {COLLABORATION_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      {state?.message ? (
        <p
          className={`rounded-xl border px-3 py-2 text-xs ${
            state.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      {state?.ok && state.inviteToken ? (
        <p
          className="break-all rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80"
          dir="ltr"
        >
          {state.inviteToken}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50"
      >
        {pending ? COLLABORATION_UI_COPY.loading : COLLABORATION_UI_COPY.inviteCreate}
      </button>
    </form>
  );
}
