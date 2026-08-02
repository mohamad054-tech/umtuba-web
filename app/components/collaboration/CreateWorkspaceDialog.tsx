"use client";

import { useActionState, useRef, useState } from "react";
import {
  createCollaborationWorkspaceAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { COLLABORATION_WORKSPACE_KINDS } from "../../../lib/collaboration/workspaceSpineFoundation";
import {
  COLLABORATION_KIND_LABELS,
  COLLABORATION_UI_COPY,
} from "../../../lib/collaboration/workspaceUi";

const initialState: CollaborationActionState = { ok: false };

export default function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    createCollaborationWorkspaceAction,
    initialState
  );

  useDialogA11y({
    open,
    onClose: () => setOpen(false),
    containerRef,
    initialFocusRef: firstFieldRef,
  });

  return (
    <>
      <button
        id="create-workspace-trigger"
        type="button"
        onClick={() => setOpen(true)}
        className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black"
      >
        {COLLABORATION_UI_COPY.createCta}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-workspace-title"
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#080816] p-5 shadow-2xl"
            dir="rtl"
            lang="ar"
          >
            <h2
              id="create-workspace-title"
              className="text-lg font-black tracking-tight"
            >
              {COLLABORATION_UI_COPY.createTitle}
            </h2>

            <form action={formAction} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="workspace-display-name"
                  className="text-[11px] font-bold text-white/45"
                >
                  {COLLABORATION_UI_COPY.nameLabel}
                </label>
                <input
                  ref={firstFieldRef}
                  id="workspace-display-name"
                  name="displayName"
                  required
                  maxLength={120}
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-slug"
                  className="text-[11px] font-bold text-white/45"
                >
                  {COLLABORATION_UI_COPY.slugLabel}
                </label>
                <input
                  id="workspace-slug"
                  name="slug"
                  required
                  dir="ltr"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={64}
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-kind"
                  className="text-[11px] font-bold text-white/45"
                >
                  {COLLABORATION_UI_COPY.kindLabel}
                </label>
                <select
                  id="workspace-kind"
                  name="kind"
                  required
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
                  defaultValue="team"
                >
                  {COLLABORATION_WORKSPACE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {COLLABORATION_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="workspace-description"
                  className="text-[11px] font-bold text-white/45"
                >
                  {COLLABORATION_UI_COPY.descriptionLabel}
                </label>
                <textarea
                  id="workspace-description"
                  name="description"
                  rows={3}
                  maxLength={4000}
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm"
                />
              </div>

              {state?.message && !state.ok ? (
                <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100" role="alert">
                  {state.message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50"
                >
                  {pending ? COLLABORATION_UI_COPY.loading : COLLABORATION_UI_COPY.createSubmit}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
