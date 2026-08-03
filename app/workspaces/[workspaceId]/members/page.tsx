import { redirect } from "next/navigation";
import CollaborationShell from "../../../components/collaboration/CollaborationShell";
import MembersList from "../../../components/collaboration/MembersList";
import ProductErrorState from "../../../components/product/ProductErrorState";
import {
  getCollaborationWorkspaceDetail,
  listCollaborationWorkspaceMembers,
} from "../../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
} from "../../../../lib/collaboration/workspaceUi";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export const metadata = {
  title: "أعضاء مساحة العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspaceMembersPage({ params }: PageProps) {
  const { workspaceId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.members(workspaceId)}`
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
        title={COLLABORATION_UI_COPY.membersTitle}
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

  return (
    <CollaborationShell
      title={`${COLLABORATION_UI_COPY.membersTitle} · ${detail.data.displayName}`}
      workspaceId={workspaceId}
      showWorkspaceNav
    >
      {!members.ok ? (
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.loadErrorTitle}
          message={members.message}
        />
      ) : (
        <MembersList
          members={members.data}
          workspaceId={workspaceId}
          currentUserId={user.id}
          myRole={detail.data.myRole}
        />
      )}
    </CollaborationShell>
  );
}
