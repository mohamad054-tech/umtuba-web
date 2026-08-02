import { redirect } from "next/navigation";
import CollaborationShell from "../../../components/collaboration/CollaborationShell";
import InvitationsList from "../../../components/collaboration/InvitationsList";
import InviteMemberForm from "../../../components/collaboration/InviteMemberForm";
import ProductErrorState from "../../../components/product/ProductErrorState";
import {
  getCollaborationWorkspaceDetail,
  listCollaborationWorkspaceInvites,
} from "../../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canManageCollaborationInvites,
  canViewCollaborationInvites,
} from "../../../../lib/collaboration/workspaceUi";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export const metadata = {
  title: "دعوات مساحة العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspaceInvitesPage({ params }: PageProps) {
  const { workspaceId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.invites(workspaceId)}`
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
        title={COLLABORATION_UI_COPY.invitesTitle}
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

  if (!canViewCollaborationInvites(detail.data.myRole)) {
    return (
      <CollaborationShell
        title={COLLABORATION_UI_COPY.invitesTitle}
        workspaceId={workspaceId}
        showWorkspaceNav
      >
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.invitesTitle}
          message="You are not allowed to perform this workspace action."
        />
      </CollaborationShell>
    );
  }

  const invites = await listCollaborationWorkspaceInvites(supabase, workspaceId);
  const canManage = canManageCollaborationInvites(detail.data.myRole);

  return (
    <CollaborationShell
      title={`${COLLABORATION_UI_COPY.invitesTitle} · ${detail.data.displayName}`}
      workspaceId={workspaceId}
      showWorkspaceNav
    >
      <div className="space-y-4">
        {canManage ? <InviteMemberForm workspaceId={workspaceId} /> : null}
        {!invites.ok ? (
          <ProductErrorState
            compact
            title={COLLABORATION_UI_COPY.loadErrorTitle}
            message={invites.message}
          />
        ) : (
          <InvitationsList
            workspaceId={workspaceId}
            invites={invites.data}
            canRevoke={canManage}
          />
        )}
      </div>
    </CollaborationShell>
  );
}
