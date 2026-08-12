"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  linkLearningWorkspaceResourceAction,
  unlinkLearningWorkspaceResourceAction,
  type CollaborationActionState,
} from "../../actions/collaboration";
import type {
  LearningWorkspaceResourceResolved,
  LinkedLearningWorkspaceResource,
} from "../../../lib/collaboration/learningWorkspaceResourceBinding";
import { COLLABORATION_UI_COPY } from "../../../lib/collaboration/workspaceUi";

const initialState: CollaborationActionState = { ok: false };

type LearningResourceLinksPanelProps = {
  workspaceId: string;
  linked: readonly LinkedLearningWorkspaceResource[];
  eligible: readonly LearningWorkspaceResourceResolved[];
  canManage: boolean;
  loadError?: string | null;
};

function LinkLearningForm({
  workspaceId,
  eligible,
}: {
  workspaceId: string;
  eligible: readonly LearningWorkspaceResourceResolved[];
}) {
  const [state, formAction, pending] = useActionState(
    linkLearningWorkspaceResourceAction,
    initialState
  );

  if (eligible.length === 0) {
    return (
      <p className="text-xs text-white/55" role="status">
        {COLLABORATION_UI_COPY.learningEligibleEmpty}
      </p>
    );
  }

  const showError = Boolean(state?.message && !state.ok);
  const messageId = "learning-link-form-message";

  return (
    <form
      action={formAction}
      className="space-y-3 border-t border-white/10 pt-4"
      aria-busy={pending}
      data-testid="collaboration-learning-link-form"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label
        htmlFor="learning-space-select"
        className="text-[11px] font-bold text-white/60"
      >
        {COLLABORATION_UI_COPY.learningLinkSelectLabel}
      </label>
      <select
        id="learning-space-select"
        name="spaceId"
        required
        disabled={pending}
        defaultValue={eligible[0]?.resourceId}
        aria-invalid={showError || undefined}
        aria-describedby={state?.message ? messageId : undefined}
        className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm disabled:opacity-50"
      >
        {eligible.map((space) => (
          <option key={space.resourceId} value={space.resourceId}>
            {space.displayLabel} (@{space.slug})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-50 disabled:opacity-50"
        data-testid="collaboration-learning-link-submit"
      >
        {pending
          ? COLLABORATION_UI_COPY.loading
          : COLLABORATION_UI_COPY.learningLinkCta}
      </button>
      {state?.message ? (
        <p
          id={messageId}
          className={`text-[11px] ${
            state.ok ? "text-emerald-200" : "text-rose-200"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function UnlinkLearningForm({
  workspaceId,
  spaceId,
}: {
  workspaceId: string;
  spaceId: string;
}) {
  const [state, formAction, pending] = useActionState(
    unlinkLearningWorkspaceResourceAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="flex flex-col items-end gap-1"
      aria-busy={pending}
      data-testid="collaboration-learning-unlink-form"
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="spaceId" value={spaceId} />
      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full border border-rose-300/30 bg-rose-400/10 px-3 py-1 text-[11px] font-bold text-rose-100 disabled:opacity-50"
        data-testid="collaboration-learning-unlink-submit"
        aria-label={COLLABORATION_UI_COPY.learningUnlinkCta}
      >
        {pending
          ? COLLABORATION_UI_COPY.loading
          : COLLABORATION_UI_COPY.learningUnlinkCta}
      </button>
      {state?.message ? (
        <p
          className={`text-[11px] ${
            state.ok ? "text-emerald-200" : "text-rose-200"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export default function LearningResourceLinksPanel({
  workspaceId,
  linked,
  eligible,
  canManage,
  loadError = null,
}: LearningResourceLinksPanelProps) {
  const headingId = "collaboration-learning-links-heading";

  return (
    <section
      className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5"
      data-testid="collaboration-learning-links-panel"
      aria-labelledby={headingId}
    >
      <div>
        <h2 id={headingId} className="text-sm font-black">
          {COLLABORATION_UI_COPY.learningLinksTitle}
        </h2>
        <p className="mt-2 text-xs leading-6 text-white/55">
          {COLLABORATION_UI_COPY.learningLinksSubtitle}
        </p>
      </div>

      {loadError ? (
        <p
          className="text-xs text-rose-200"
          role="alert"
          data-testid="collaboration-learning-links-error"
        >
          {loadError}
        </p>
      ) : linked.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center"
          role="status"
          data-testid="collaboration-learning-links-empty"
        >
          <p className="text-sm font-bold text-white/80">
            {COLLABORATION_UI_COPY.learningLinksEmpty}
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10"
          aria-label={COLLABORATION_UI_COPY.learningLinksTitle}
          data-testid="collaboration-learning-links-list"
        >
          {linked.map((item) => (
            <li
              key={item.linkId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              data-testid="collaboration-learning-link-row"
            >
              <div>
                <p className="text-sm font-bold">{item.resource.displayLabel}</p>
                <p className="mt-1 text-xs text-white/55" dir="ltr">
                  @{item.resource.slug} · {item.resource.status}
                </p>
                <Link
                  href={item.resource.href}
                  className="watch-focus-ring mt-2 inline-block rounded text-[11px] font-bold text-cyan-200/90 underline-offset-2 hover:underline"
                >
                  {COLLABORATION_UI_COPY.learningOpenResource}
                </Link>
              </div>
              {canManage ? (
                <UnlinkLearningForm
                  workspaceId={workspaceId}
                  spaceId={item.resource.resourceId}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <LinkLearningForm workspaceId={workspaceId} eligible={eligible} />
      ) : (
        <p
          className="border-t border-white/10 pt-4 text-xs text-white/55"
          role="status"
          data-testid="collaboration-learning-links-unauthorized"
        >
          {COLLABORATION_UI_COPY.unauthorizedAction}
        </p>
      )}
    </section>
  );
}
