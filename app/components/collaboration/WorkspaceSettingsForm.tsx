"use client";

import { useActionState } from "react";
import {
  updateCollaborationWorkspaceSettingsAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import { COLLABORATION_WORKSPACE_KINDS } from "../../../lib/collaboration/workspaceSpineFoundation";
import {
  COLLABORATION_KIND_LABELS,
  COLLABORATION_UI_COPY,
} from "../../../lib/collaboration/workspaceUi";
import type { CollaborationWorkspaceKind } from "../../../lib/collaboration/workspaceSpineFoundation";

const initialState: CollaborationActionState = { ok: false };

type WorkspaceSettingsFormProps = {
  workspaceId: string;
  displayName: string;
  description: string | null;
  kind: CollaborationWorkspaceKind;
  allowMemberInvites: boolean;
  publicMemberDirectory: boolean;
};

export default function WorkspaceSettingsForm({
  workspaceId,
  displayName,
  description,
  kind,
  allowMemberInvites,
  publicMemberDirectory,
}: WorkspaceSettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCollaborationWorkspaceSettingsAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <h2 className="text-sm font-black">{COLLABORATION_UI_COPY.settingsTitle}</h2>

      <div>
        <label
          htmlFor="settings-display-name"
          className="text-[11px] font-bold text-white/45"
        >
          {COLLABORATION_UI_COPY.nameLabel}
        </label>
        <input
          id="settings-display-name"
          name="displayName"
          type="text"
          required
          maxLength={120}
          defaultValue={displayName}
          className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="settings-kind"
          className="text-[11px] font-bold text-white/45"
        >
          {COLLABORATION_UI_COPY.kindLabel}
        </label>
        <select
          id="settings-kind"
          name="kind"
          defaultValue={kind}
          className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
        >
          {COLLABORATION_WORKSPACE_KINDS.map((value) => (
            <option key={value} value={value}>
              {COLLABORATION_KIND_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="settings-description"
          className="text-[11px] font-bold text-white/45"
        >
          {COLLABORATION_UI_COPY.descriptionLabel}
        </label>
        <textarea
          id="settings-description"
          name="description"
          rows={4}
          maxLength={4000}
          defaultValue={description ?? ""}
          className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/75">
        <input
          type="checkbox"
          name="allowMemberInvites"
          defaultChecked={allowMemberInvites}
          className="watch-focus-ring size-4 rounded border-white/20 bg-[#050510]"
        />
        {COLLABORATION_UI_COPY.allowMemberInvitesLabel}
      </label>

      <label className="flex items-center gap-2 text-sm text-white/75">
        <input
          type="checkbox"
          name="publicMemberDirectory"
          defaultChecked={publicMemberDirectory}
          className="watch-focus-ring size-4 rounded border-white/20 bg-[#050510]"
        />
        {COLLABORATION_UI_COPY.publicMemberDirectoryLabel}
      </label>

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

      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50"
      >
        {pending
          ? COLLABORATION_UI_COPY.loading
          : COLLABORATION_UI_COPY.saveSettings}
      </button>
    </form>
  );
}
