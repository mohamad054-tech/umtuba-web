import Link from "next/link";
import type { CollaborationWorkspaceView } from "../../../lib/learning/collaborationWorkspaceSpine";
import LearningShell from "./LearningShell";
import CollaborationWorkspaceNav from "./CollaborationWorkspaceNav";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";

type Props = {
  view: CollaborationWorkspaceView;
};

function attachmentStateLabel(state: "empty" | "unavailable"): string {
  return state === "empty" ? "Empty" : "Unavailable";
}

export default function CollaborationWorkspaceShell({ view }: Props) {
  const memberLabel =
    view.access.spaceMemberActive === true
      ? "Active Space member"
      : view.access.spaceMemberActive === false
        ? "Not a Space member (course entitlement still applies)"
        : "Space membership unknown";

  return (
    <LearningShell
      title="Course workspace"
      subtitle={view.course.courseName}
      backHref={LEARNING_LEARNER_ROUTES.course(view.course.courseId)}
      backLabel="Course"
    >
      <CollaborationWorkspaceNav
        courseId={view.course.courseId}
        active="workspace"
      />

      <section
        aria-labelledby="workspace-identity-heading"
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
      >
        <h2
          id="workspace-identity-heading"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40"
        >
          Workspace identity
        </h2>
        <p className="mt-2 text-sm font-bold text-white/90">
          {view.course.courseName}
        </p>
        <p className="mt-1 break-all font-mono text-xs text-white/45">
          {view.identity.workspaceKey}
        </p>
        <dl className="mt-4 grid gap-2 text-sm text-white/60">
          <div>
            <dt className="text-white/40">Parent Learning Space</dt>
            <dd className="font-bold text-white/80">{view.space.spaceName}</dd>
          </div>
          <div>
            <dt className="text-white/40">Access</dt>
            <dd>
              Course entitled · {memberLabel}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Authorization</dt>
            <dd className="font-mono text-xs">
              {view.access.authorizationModel} / {view.access.membershipModel}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="workspace-attachments-heading" className="mt-8">
        <h2
          id="workspace-attachments-heading"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40"
        >
          Attachment slots
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Spine foundation V1 exposes explicit empty or unavailable slots only.
          No realtime, shared files, presence, or AI shared memory.
        </p>
        <ul className="mt-4 space-y-3">
          {view.attachments.map((slot) => (
            <li
              key={slot.id}
              className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-white/90">{slot.label}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {attachmentStateLabel(slot.state)}
                </p>
              </div>
              <p className="mt-1 text-xs text-white/45">{slot.reason}</p>
              {slot.relatedHref ? (
                <Link
                  href={slot.relatedHref}
                  className="watch-focus-ring mt-3 inline-block text-sm font-bold text-sky-300 hover:text-sky-200"
                >
                  Open existing Learning surface
                </Link>
              ) : (
                <p role="status" className="mt-3 text-sm text-white/40">
                  No course-level surface wired for this slot yet.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </LearningShell>
  );
}
