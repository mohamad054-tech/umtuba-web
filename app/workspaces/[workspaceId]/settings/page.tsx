import { redirect } from "next/navigation";
import CollaborationShell from "../../../components/collaboration/CollaborationShell";
import WorkspaceSettingsPanel from "../../../components/collaboration/WorkspaceSettingsPanel";
import ProductErrorState from "../../../components/product/ProductErrorState";
import { getCollaborationWorkspaceDetail } from "../../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  canManageCollaborationWorkspace,
} from "../../../../lib/collaboration/workspaceUi";
import { resolveCollaborationLifecycleCapabilities } from "../../../../lib/collaboration/workspaceSettingsLifecycle";
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

  if (!canManageCollaborationWorkspace(detail.data.myRole)) {
    return (
      <CollaborationShell
        title={COLLABORATION_UI_COPY.settingsTitle}
        workspaceId={workspaceId}
        showWorkspaceNav
      >
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.settingsTitle}
          message={COLLABORATION_UI_COPY.settingsDenied}
        />
      </CollaborationShell>
    );
  }

  const capabilities = resolveCollaborationLifecycleCapabilities({
    role: detail.data.myRole,
    status: detail.data.status,
  });

  return (
    <CollaborationShell
      title={`${COLLABORATION_UI_COPY.settingsTitle} · ${detail.data.displayName}`}
      subtitle={COLLABORATION_UI_COPY.settingsSubtitle}
      workspaceId={workspaceId}
      showWorkspaceNav
    >
      <WorkspaceSettingsPanel
        detail={detail.data}
        capabilities={capabilities}
      />
    </CollaborationShell>
  );
}
