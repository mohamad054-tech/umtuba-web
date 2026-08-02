import Link from "next/link";
import type { CollaborationWorkspaceSummary } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  collaborationKindLabel,
  collaborationRoleLabel,
  collaborationStatusLabel,
} from "../../../lib/collaboration/workspaceUi";

type WorkspaceCardProps = {
  workspace: CollaborationWorkspaceSummary;
};

export default function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {collaborationKindLabel(workspace.kind)}
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight">
            {workspace.displayName}
          </h2>
          <p className="mt-1 text-xs text-white/45" dir="ltr">
            @{workspace.slug}
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
          {collaborationStatusLabel(workspace.status)}
        </span>
      </div>

      {workspace.description ? (
        <p className="mt-3 text-sm leading-7 text-white/55">
          {workspace.description}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/55">
        <div>
          <dt className="text-white/35">{COLLABORATION_UI_COPY.myRoleLabel}</dt>
          <dd className="mt-1 font-bold text-white/80">
            {collaborationRoleLabel(workspace.myRole)}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">{COLLABORATION_UI_COPY.statusLabel}</dt>
          <dd className="mt-1 font-bold text-white/80">
            {collaborationStatusLabel(workspace.status)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <Link
          href={COLLABORATION_UI_ROUTES.workspace(workspace.id)}
          className="watch-focus-ring inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-black"
        >
          {COLLABORATION_UI_COPY.openWorkspace}
        </Link>
      </div>
    </article>
  );
}
