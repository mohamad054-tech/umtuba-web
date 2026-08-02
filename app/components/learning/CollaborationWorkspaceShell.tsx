import Link from "next/link";
import type { CollaborationWorkspaceView } from "../../../lib/learning/collaborationWorkspaceSpine";
import type { CollaborationWorkspaceAttachmentCard } from "../../../lib/learning/collaborationWorkspaceAttachments";
import type { CollaborationWorkspaceTimelineItem } from "../../../lib/learning/collaborationWorkspaceTimeline";
import LearningShell from "./LearningShell";
import CollaborationWorkspaceNav from "./CollaborationWorkspaceNav";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";

type Props = {
  view: CollaborationWorkspaceView;
  attachments: CollaborationWorkspaceAttachmentCard[];
  timeline: CollaborationWorkspaceTimelineItem[];
  timelineAvailability?: "available" | "empty" | "unavailable";
};

function iconGlyph(icon: CollaborationWorkspaceAttachmentCard["icon"]): string {
  switch (icon) {
    case "community":
      return "◎";
    case "assignments":
      return "▣";
    case "tutor":
      return "◈";
    case "live":
      return "◉";
    default:
      return "○";
  }
}

function availabilityLabel(
  availability: CollaborationWorkspaceAttachmentCard["availability"]
): string {
  if (availability === "available") return "Available";
  if (availability === "empty") return "Empty";
  return "Unavailable";
}

function sourceLabel(source: CollaborationWorkspaceTimelineItem["source"]): string {
  if (source === "assignments_projects") return "Assignments";
  if (source === "tutor") return "AI Tutor";
  if (source === "live") return "Live";
  return "Community";
}

export default function CollaborationWorkspaceShell({
  view,
  attachments,
  timeline,
  timelineAvailability = "available",
}: Props) {
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
            <dd>Course entitled · {memberLabel}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="workspace-attachments-heading" className="mt-8">
        <h2
          id="workspace-attachments-heading"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40"
        >
          Workspace attachments
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Live summaries from existing Learning services. No realtime chat,
          shared documents, or shared AI memory.
        </p>
        <ul className="mt-4 space-y-3">
          {attachments.map((card) => (
            <li
              key={card.id}
              className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-white/90">
                  <span aria-hidden className="mr-2 text-white/50">
                    {iconGlyph(card.icon)}
                  </span>
                  {card.title}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {availabilityLabel(card.availability)}
                </p>
              </div>
              <p className="mt-2 text-sm text-white/70">{card.summary}</p>
              {card.unreadIndicator ? (
                <p className="mt-2 text-xs font-bold text-amber-200/80">
                  Attention: {card.unreadIndicator.count} unanswered question
                  {card.unreadIndicator.count === 1 ? "" : "s"}
                </p>
              ) : null}
              {card.availability === "unavailable" ? (
                <p role="status" className="mt-3 text-sm text-white/40">
                  Unavailable — no attachment data for this section right now.
                </p>
              ) : null}
              {card.ctaHref && card.ctaLabel ? (
                <Link
                  href={card.ctaHref}
                  className="watch-focus-ring mt-3 inline-block text-sm font-bold text-sky-300 hover:text-sky-200"
                >
                  {card.ctaLabel}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="workspace-timeline-heading" className="mt-10">
        <h2
          id="workspace-timeline-heading"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40"
        >
          Activity Timeline
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Unified chronological feed from Community, Assignments, AI Tutor, and
          Live. Read-model only — no realtime.
        </p>
        {timelineAvailability === "unavailable" ? (
          <p role="status" className="mt-4 text-sm text-white/40">
            Timeline unavailable — Learning sources could not be loaded.
          </p>
        ) : null}
        {timelineAvailability === "empty" ? (
          <p role="status" className="mt-4 text-sm text-white/40">
            No timeline activity yet for this course.
          </p>
        ) : null}
        {timeline.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {timeline.map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-white/90">{entry.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    {sourceLabel(entry.source)}
                    {entry.unread ? " · Unread" : ""}
                  </p>
                </div>
                <p className="mt-2 text-sm text-white/70">{entry.summary}</p>
                {entry.timestamp ? (
                  <p className="mt-1 font-mono text-xs text-white/40">
                    {entry.timestamp}
                  </p>
                ) : null}
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="watch-focus-ring mt-3 inline-block text-sm font-bold text-sky-300 hover:text-sky-200"
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </LearningShell>
  );
}
