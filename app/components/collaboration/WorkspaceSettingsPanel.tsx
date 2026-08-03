import type { CollaborationWorkspaceDetail } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  collaborationKindLabel,
  collaborationRoleLabel,
  collaborationStatusLabel,
} from "../../../lib/collaboration/workspaceUi";
import type { CollaborationLifecycleCapabilities } from "../../../lib/collaboration/workspaceSettingsLifecycle";
import ArchiveWorkspaceForm from "./ArchiveWorkspaceForm";
import ActivateWorkspaceForm from "./ActivateWorkspaceForm";
import LeaveWorkspaceForm from "./LeaveWorkspaceForm";

type WorkspaceSettingsPanelProps = {
  detail: CollaborationWorkspaceDetail;
  capabilities: CollaborationLifecycleCapabilities;
};

export default function WorkspaceSettingsPanel({
  detail,
  capabilities,
}: WorkspaceSettingsPanelProps) {
  return (
    <div className="grid gap-5" data-testid="collaboration-settings-panel">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
        <h2 className="text-lg font-black tracking-tight">
          {COLLABORATION_UI_COPY.settingsTitle}
        </h2>
        <p className="mt-2 text-sm leading-7 text-white/55">
          {COLLABORATION_UI_COPY.profileReadOnlyNote}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:col-span-2">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.nameLabel}
            </dt>
            <dd className="mt-1 text-sm font-bold">{detail.displayName}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.slugLabel}
            </dt>
            <dd className="mt-1 text-sm font-bold" dir="ltr">
              @{detail.slug}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.kindLabel}
            </dt>
            <dd className="mt-1 text-sm font-bold">
              {collaborationKindLabel(detail.kind)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.statusLabel}
            </dt>
            <dd
              className="mt-1 text-sm font-bold"
              data-testid="collaboration-lifecycle-status"
            >
              {collaborationStatusLabel(detail.status)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.myRoleLabel}
            </dt>
            <dd className="mt-1 text-sm font-bold">
              {collaborationRoleLabel(detail.myRole)}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:col-span-2">
            <dt className="text-[11px] text-white/40">
              {COLLABORATION_UI_COPY.descriptionLabel}
            </dt>
            <dd className="mt-1 text-sm leading-7 text-white/70">
              {detail.description?.trim() || "—"}
            </dd>
          </div>
        </dl>

        {/* Fail-closed: no editable profile controls are rendered. */}
        {!capabilities.profileEditable ? (
          <p
            className="mt-4 text-xs text-white/40"
            data-testid="collaboration-profile-readonly"
          >
            {COLLABORATION_UI_COPY.profileEditUnsupported}
          </p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
        <h2 className="text-lg font-black tracking-tight">
          {COLLABORATION_UI_COPY.lifecycleTitle}
        </h2>

        <div className="mt-4 grid gap-4">
          {capabilities.canActivate ? (
            <ActivateWorkspaceForm workspaceId={detail.id} />
          ) : null}

          {capabilities.canArchive ? (
            <ArchiveWorkspaceForm workspaceId={detail.id} />
          ) : (
            <p className="text-sm text-white/45">
              {COLLABORATION_UI_COPY.archiveDisabled}
            </p>
          )}

          {capabilities.canLeave ? (
            <LeaveWorkspaceForm workspaceId={detail.id} />
          ) : (
            <p className="text-sm text-white/45">
              {COLLABORATION_UI_COPY.leaveDisabled}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
