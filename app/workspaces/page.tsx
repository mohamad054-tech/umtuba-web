import { redirect } from "next/navigation";
import CollaborationShell from "../components/collaboration/CollaborationShell";
import CreateWorkspaceDialog from "../components/collaboration/CreateWorkspaceDialog";
import WorkspaceList from "../components/collaboration/WorkspaceList";
import WorkspaceSwitcher from "../components/collaboration/WorkspaceSwitcher";
import ProductErrorState from "../components/product/ProductErrorState";
import { listMyCollaborationWorkspaces } from "../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
} from "../../lib/collaboration/workspaceUi";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

export const metadata = {
  title: "مساحات العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspacesPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.root}`);
  }

  const supabase = await createClient();
  const result = await listMyCollaborationWorkspaces(supabase, user.id);

  return (
    <CollaborationShell
      title={COLLABORATION_UI_COPY.workspacesTitle}
      showWorkspaceNav
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {COLLABORATION_UI_COPY.brand}
        </p>
        <CreateWorkspaceDialog />
      </div>

      {!result.ok ? (
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.loadErrorTitle}
          message={result.message}
        />
      ) : (
        <>
          <div className="mb-4">
            <WorkspaceSwitcher workspaces={result.data} />
          </div>
          <WorkspaceList workspaces={result.data} />
        </>
      )}
    </CollaborationShell>
  );
}
