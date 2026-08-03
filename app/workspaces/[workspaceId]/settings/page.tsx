import { redirect } from "next/navigation";
import CollaborationShell from "../../../components/collaboration/CollaborationShell";
import WorkspaceLifecyclePanel from "../../../components/collaboration/WorkspaceLifecyclePanel";
import WorkspaceSettingsForm from "../../../components/collaboration/WorkspaceSettingsForm";
import ProductErrorState from "../../../components/product/ProductErrorState";
import {
  getCollaborationWorkspaceDetail,
  listCollaborationWorkspaceMembers,
} from "../../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canManageCollaborationWorkspaceSettings,
} from "../../../../lib/collaboration/workspaceUi";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export const metadata = {
  title: "إعدادات مساحة العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspaceSettingsPage({ params }: PageProps) {
  const { workspaceId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.settings(workspaceId)}`
    );
  }

  const supabase = await createClient();
  const detail = await getCollaborationWorkspaceDetail(
    supabase,
    workspaceId,
    user.id
  );

  if (!detail.ok) {
    return (
      <CollaborationShell
        title={COLLABORATION_UI_COPY.settingsTitle}
        workspaceId={workspaceId}
        showWorkspaceNav
      >
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.loadErrorTitle}
          message={detail.message}
        />
      </CollaborationShell>
    );
  }

  const members = await listCollaborationWorkspaceMembers(supabase, workspaceId);
  const canEditSettings = canManageCollaborationWorkspaceSettings(
    detail.data.myRole
  );

  return (
    <CollaborationShell
      title={`${COLLABORATION_UI_COPY.settingsTitle} · ${detail.data.displayName}`}
      workspaceId={workspaceId}
      showWorkspaceNav
    >
      <div className="space-y-5">
        {canEditSettings ? (
          <WorkspaceSettingsForm
            workspaceId={workspaceId}
            displayName={detail.data.displayName}
            description={detail.data.description}
            kind={detail.data.kind}
            allowMemberInvites={detail.data.settings.allowMemberInvites}
            publicMemberDirectory={detail.data.settings.publicMemberDirectory}
          />
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="text-sm font-black">
              {COLLABORATION_UI_COPY.settingsTitle}
            </h2>
            <p className="mt-2 text-xs text-white/50">
              {COLLABORATION_UI_COPY.unauthorizedAction}
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-[11px] text-white/40">
                  {COLLABORATION_UI_COPY.nameLabel}
                </dt>
                <dd className="mt-1 font-bold">{detail.data.displayName}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-white/40">
                  {COLLABORATION_UI_COPY.kindLabel}
                </dt>
                <dd className="mt-1 font-bold">{detail.data.kind}</dd>
              </div>
            </dl>
          </section>
        )}

        <WorkspaceLifecyclePanel
          workspaceId={workspaceId}
          myRole={detail.data.myRole}
          members={members.ok ? members.data : []}
          currentUserId={user.id}
        />
      </div>
    </CollaborationShell>
  );
}
